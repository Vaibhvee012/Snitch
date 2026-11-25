import mongoose from "mongoose";
import { config } from "../src/config/config.js";

const applyChanges = process.argv.includes("--apply");
const migrationId = `cart-per-user-${new Date().toISOString().replaceAll(":", "-")}`;

const getUserId = (document) => document.user?.toString();

const getItems = (document) => {
    if (Array.isArray(document.items)) return document.items;
    if (document.product && document.variant) {
        return [{
            _id: document.itemId || new mongoose.Types.ObjectId(),
            product: document.product,
            variant: document.variant,
            quantity: document.quantity || 1,
            ...(document.price ? { price: document.price } : {}),
        }];
    }
    return [];
};

const mergeItems = (documents) => {
    const itemsByKey = new Map();

    for (const document of documents) {
        for (const item of getItems(document)) {
            if (!item.product || !item.variant) {
                throw new Error(
                    `Cart document ${document._id} contains an item without product or variant`
                );
            }

            const productId = item.product.toString();
            const variantId = item.variant.toString();
            const key = `${productId}:${variantId}`;
            const existing = itemsByKey.get(key);

            if (existing) {
                existing.quantity += Number(item.quantity) || 1;
                if (item.price) existing.price = item.price;
            } else {
                itemsByKey.set(key, {
                    ...item,
                    product: item.product,
                    variant: item.variant,
                    quantity: Number(item.quantity) || 1,
                    _id: item._id || new mongoose.Types.ObjectId(),
                });
            }
        }
    }

    return [...itemsByKey.values()];
};

const summarizeItems = (items) =>
    items
        .map((item) => ({
            product: item.product.toString(),
            variant: item.variant.toString(),
            quantity: Number(item.quantity) || 1,
        }))
        .sort((left, right) =>
            `${left.product}:${left.variant}`.localeCompare(`${right.product}:${right.variant}`)
        );

const needsConsolidation = (migration) => {
    const storedItemCount = migration.documents.reduce(
        (total, document) => total + (Array.isArray(document.items) ? document.items.length : 0),
        0
    );

    return (
        migration.documents.length > 1 ||
        migration.documents.some((document) => !Array.isArray(document.items)) ||
        storedItemCount !== migration.items.length
    );
};

try {
    await mongoose.connect(config.MONGO_URI);

    const database = mongoose.connection.db;
    const carts = database.collection("carts");
    const backups = database.collection("cart_migration_backups");
    const documents = await carts.find({}).toArray();
    const indexes = await carts.indexes();
    const groups = new Map();

    for (const document of documents) {
        const userId = getUserId(document);
        if (!userId) {
            throw new Error(`Cart document ${document._id} has no user reference`);
        }
        if (!groups.has(userId)) groups.set(userId, []);
        groups.get(userId).push(document);
    }

    const migrations = [...groups.entries()].map(([userId, userDocuments]) => {
        const ordered = userDocuments.sort((left, right) => {
            const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
            const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;
            return leftDate - rightDate || left._id.toString().localeCompare(right._id.toString());
        });

        return {
            userId,
            documents: ordered,
            canonical: ordered[0],
            items: mergeItems(ordered),
        };
    });

    const products = database.collection("products");
    for (const migration of migrations) {
        for (const item of migration.items) {
            if (item.price) continue;

            const product = await products.findOne(
                {
                    _id: item.product,
                    "variants._id": item.variant,
                },
                { projection: { price: 1, variants: 1 } }
            );
            const variant = product?.variants?.find(
                (entry) => entry._id.toString() === item.variant.toString()
            );
            item.price = variant?.price || product?.price;
            if (!item.price) {
                throw new Error(
                    `Cannot recover price for cart product ${item.product} variant ${item.variant}`
                );
            }
        }
    }

    console.log(JSON.stringify({
        mode: applyChanges ? "apply" : "dry-run",
        cartDocuments: documents.length,
        users: migrations.length,
        usersWithMultipleCarts: migrations.filter(({ documents: userDocs }) => userDocs.length > 1).length,
        documentsRequiringEmbedding: documents.filter(
            (document) => !Array.isArray(document.items) && (document.product || document.variant)
        ).length,
        usersRequiringConsolidation: migrations.filter(needsConsolidation).length,
        plannedItems: migrations.reduce((total, migration) => total + migration.items.length, 0),
        indexes: indexes.map(({ name, key, unique }) => ({ name, key, unique: Boolean(unique) })),
        migrationId,
    }, null, 2));

    if (!applyChanges) {
        console.log("No data changed. Re-run with --apply to back up and consolidate cart documents.");
        process.exitCode = 0;
    } else {
        const requiresConsolidation = migrations.some(needsConsolidation);
        if (requiresConsolidation) {
        const backupOperations = documents.map((document) => ({
            replaceOne: {
                filter: { migrationId, sourceDocumentId: document._id.toString() },
                replacement: {
                    migrationId,
                    sourceDocumentId: document._id.toString(),
                    snapshot: document,
                    backedUpAt: new Date(),
                },
                upsert: true,
            },
        }));

        if (backupOperations.length) {
            await backups.bulkWrite(backupOperations, { ordered: true });
        }
        const backupCount = await backups.countDocuments({ migrationId });
        if (backupCount !== documents.length) {
            throw new Error(`Backup verification failed: expected ${documents.length}, found ${backupCount}`);
        }
        for (const document of documents) {
            const backup = await backups.findOne({
                migrationId,
                sourceDocumentId: document._id.toString(),
            });
            if (!backup || backup.snapshot?._id?.toString() !== document._id.toString()) {
                throw new Error(`Backup verification failed for cart ${document._id}`);
            }
        }

        const now = new Date();
        for (const migration of migrations) {
            const expected = summarizeItems(migration.items);
            await carts.replaceOne(
                { _id: migration.canonical._id },
                {
                    _id: migration.canonical._id,
                    user: migration.canonical.user,
                    items: migration.items,
                    createdAt: migration.canonical.createdAt || now,
                    updatedAt: now,
                }
            );

            const saved = await carts.findOne({ _id: migration.canonical._id });
            if (!saved || JSON.stringify(summarizeItems(saved.items || [])) !== JSON.stringify(expected)) {
                throw new Error(`Cart verification failed for user ${migration.userId}; no duplicate documents were deleted`);
            }
        }

        for (const migration of migrations) {
            const duplicateIds = migration.documents
                .slice(1)
                .map((document) => document._id);
            if (duplicateIds.length) {
                await carts.deleteMany({ _id: { $in: duplicateIds } });
            }
        }
        } else {
            console.log("No cart consolidation is needed; cart documents were left unchanged.");
        }

        const remaining = await carts.countDocuments({});
        if (remaining !== migrations.length) {
            throw new Error(`Final cart count verification failed: expected ${migrations.length}, found ${remaining}`);
        }

        const userIndex = indexes.find(
            (index) =>
                Object.keys(index.key || {}).length === 1 &&
                index.key.user === 1
        );
        if (userIndex?.unique) {
            console.log(`Unique user index already exists: ${userIndex.name}`);
        } else {
            if (userIndex) await carts.dropIndex(userIndex.name);
            await carts.createIndex({ user: 1 }, { unique: true, name: "user_1" });
        }
        console.log("Migration verified. Original documents remain in cart_migration_backups.");
    }
} catch (error) {
    console.error("Cart migration failed:", error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
