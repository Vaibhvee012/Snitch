import React from "react";
import { Outlet } from "react-router-dom";
import Nav from "../features/Shared/Components/Nav";

const Applayout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-[#fbf9f6]">
            <Nav />
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
};

export default Applayout;
