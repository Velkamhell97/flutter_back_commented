import { Document } from "mongoose";
import { ProductsRequest, ProductsResponse } from "../../interfaces/products";

import { Product } from "../../models";
import cloudinary from "../../models/cloudinary";

/**
 * @path /api/products/ : GET
 */
export const getProductsController = async (_req: ProductsRequest, res: ProductsResponse) => {
  try {
    const categories = await Product.find({state: true})
    .populate('user', 'name')
    .populate('category','name');

    return res.json({
      msg:'Get all products successfully',
      categories
    })
  } catch (error) {
    console.log(error);
    
    return res.status(500).json({
      msg: 'Get all products failed',
      error,
    })
  }
}


/**
 * @path /api/products/search?name=:name : GET
 */
 export const getProductsByNameController = async(req: ProductsRequest, res: ProductsResponse) => {
  //->Los querys no estan tipados a string, en vez de crear una interfaz mejor se convierten a strings
  const { name } = req.query; //-> Para el tipado

  const lower = name?.toString().toLowerCase();

  try {
    // const categories = await Product.find({lower:lower}); //--> Exact Match
    const products = await Product.find({lower: new RegExp('^' + lower)}) //--> Prefix Match (stars with)

    return res.json({
      msg:'Get products by name successfully',
      products
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      msg: 'Get products by name failed',
      error,
    })
  }
}


/**
 * @path /api/products/:id : GET
 */
 export const getProductByIdController = async(_req: ProductsRequest, res: ProductsResponse) => {
  //->Product cargado en el validate product - (GETBYID)
  const product = res.locals.product;

  await (await product.populate('user','name')).populate('category','name');

  return res.json({
    msg:'Get product by id successfully',
    product
  })
}


/**
 * @path /api/products/ : POST
 */
 export const createProductController = async (req: ProductsRequest, res: ProductsResponse) => {
  //->Se extraen los campos que no deben ser manipulados en el body - (CREATE, UPDATE)
  const { state, ...productData } = req.body;

  const authUser = res.locals.authUser;
  const img = res.locals.img;

  //->Se establece en user autenticado (jwt validation) como creador
  const product  = new Product(productData);
  productData.user = authUser.id;

  if(img){
    const response = await cloudinary.uploadImage({path: img.tempFilePath, filename: product.id, folder: 'products'});
    productData.img = response.secure_url;
  }

  try {
    //->Por el middleware del category, esta se asgina al body (su id), quedando en el rest (CREATE - UPDATE)

    await product.save();
    await product.populate('user', 'name');
    await product.populate('category', 'name');

    return res.status(500).json({
      msg: 'Product saved successfully',
      product,
    })
  } catch (error) {
    console.log(error);
    
    return res.status(500).json({
      msg: 'Product saved failed',
      error,
    })
  }
}


/**
 * @path /api/products/:id : PUT
 */
 export const updateProductController = async (req: ProductsRequest, res: ProductsResponse) => {
  const { id } = req.params;
  const { state, user, ...rest } = req.body;

  const oldProduct = res.locals.product;
  const img = res.locals.img;

  if(img){
    try {
      const response = await cloudinary.uploadImageBytes(img.data, 'products')
      console.log(response);
    } catch (error : any) {
      console.log(error.code);
    
      return res.status(500).json({
        msg: 'Error updating the img',
        error,
      })
    }
  }

  try {
    //->Mas legible, no el mas rapido, se pueden ver otras opciones en el old - (UPDATE, DELETE)
    const product  = await Product.findByIdAndUpdate(id, rest, {new: true})
    .populate('user', 'name')
    .populate('category', 'name');

    return res.json({
      msg: 'Product updated successfully',
      product,
    })
  } catch (error) {
    console.log(error);
    
    return res.status(500).json({
      msg: 'Product updated failed',
      error,
    })
  }
}


/**
 * @path /api/products/:id : DELETE
 */
 export const deleteProductController = async (req: ProductsRequest, res: ProductsResponse) => {
  const { id } = req.params;

  try {
    //->En este punto ya se verifico que el creador de esta categoria es el que la intenta borrar
    const product  = await Product.findByIdAndUpdate(id, { state: false }, { new: true })
    .populate('user', 'name')
    .populate('category', 'name');

    return res.json({
      msg: 'Product deleted successfully',
      product,
    })
  } catch (error) {
    console.log(error);
    
    return res.status(500).json({
      msg: 'Product deleted failed',
      error,
    })
  }
}