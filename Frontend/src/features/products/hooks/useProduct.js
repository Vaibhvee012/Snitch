import { createProduct, getSellerProduct} from "../service/product.api";
import {useDispatch} from 'react-redux'
import {setSellerProducts} from "../state/product.slice"

 
export const useProduct = () =>{

    const dispatch = useDispatch()

    async function handleCreateProduct(formData){
        const data =  await createProduct(formData)
        return data.product
   }


   async function handleGetSellerProduct(){
    const data = await getSellerProduct();
    const products = data.products || (data.product ? [data.product] : (Array.isArray(data) ? data : []));
    dispatch(setSellerProducts(data));
    return products;
   }

   return {handleCreateProduct, handleGetSellerProduct}
}