import { Response } from "express";
import { Op } from "sequelize";

import { catchError, errorTypes } from "../errors";
import { ProductsRequest } from "../interfaces/products";
import cloudinary from "../models/cloudinary";
import { Product, User } from "../models";
import db from "../database/connection";
import { v4 } from "uuid";


/**
 * @controller /api/products/ : GET
 */
export const getProductsController = async (_req: ProductsRequest, res: Response) => {
  try {
    const categories = await Product.scope('withDetails').findAll({where: { state: true }});

    return res.json({msg:'Get all products successfully', categories});
  } catch (error) {
    return catchError({error, type: errorTypes.get_products, res});
  }
}


/**
 * @controller /api/products/search?name=:name : GET
 */
 export const getProductsByNameController = async(req: ProductsRequest, res: Response) => {
  const { name } = req.query;

  const lower = name?.toString().toLowerCase();

  try {
    const products = await Product.scope('withDetails').findAll({
      where: {
        lower: { [Op.like]: lower + "%"},
        state: true
      }
    }); //--> Prefix Match (starts with)

    return res.json({msg:'Get products by name successfully', products});
  } catch (error) {
    return catchError({error, type: errorTypes.get_products_by_name, res});
  }
}


/**
 * @controller /api/products/:id : GET
 */
 export const getProductByIdController = async(_req: ProductsRequest, res: Response) => {
  const product: Product = res.locals.product;

  return res.json({msg:'Get product by id successfully', product});
}


/**
 * @controller /api/products/ : POST
 */
 export const createProductController = async (req: ProductsRequest, res: Response) => {
  const { state, category, ...productData } = req.body;

  const authUser: User = res.locals.authUser;
  productData.ownerId = authUser.id;

  const img: Express.Multer.File | undefined = res.locals.file;

  try {
    const result = await db.transaction(async(t) => {
      const product = await Product.create(productData, {
        //-No util porque el nuevo usuario no tiene categorias
        // include: { model: Category, as: 'caetgories', attributes: ["name"] }
        //-Para que la transaccion tenga rollback no olvidar este parametro
        transaction: t
      });

      if(img){
        //-Podemos crear un id nosotros o dejar que cloudinary genere uno, si cloudinary lo genera
        //-no seria necesario hacer la transaccion ya que podriamos crear el usuario con el avatar fijado
        const ref = v4() + "-" + product.id

        try {
          // const response = await cloudinary.uploadImage({path: avatar.path, folder: 'users'});
          const response = await cloudinary.uploadImage({path: img.path, filename: ref, folder: 'products'});
          product.img = response.secure_url;
        } catch (error) { 
          throw {error, type: errorTypes.upload_cloudinary, res};
        }
      }

      await product.save({transaction: t});
    
      return product;
    });

    return res.json({msg: 'Product saved successfully', result});
  } catch (error) {
    return catchError({error, type: errorTypes.save_product, res});
  }
}


/**
 * @controller /api/products/:id : PUT
 */
 export const updateProductController = async (req: ProductsRequest, res: Response) => {
  const { id } = req.params;
  const { state, ownerId, ...productData } = req.body;

  //-A pesar de que se pasa por los res parece ser un lugar seguro
  const product: Product = res.locals.product;

  const img: Express.Multer.File | undefined = res.locals.file;
  
  try {
    //-una forma de aprovechar el query pasado y no hacer mas
    // await product.update(productData);

    if(img){
      try {
        const response = await cloudinary.uploadImage({path: img.path, filename: product.img, folder: 'products'});
        productData.img = response.secure_url;
      } catch (error) { 
        return catchError({error, type: errorTypes.upload_cloudinary, res});
      }
    }

    await product.update(productData);

    return res.json({msg: 'Product updated successfully', product});
  } catch (error) {
    return catchError({error, type: errorTypes.update_product, res});
  }
}


/**
 * @controller /api/products/:id : DELETE
 */
 export const deleteProductController = async (req: ProductsRequest, res: Response) => {
  const { id } = req.params;
  const product: Product = res.locals.product;

  try {
    // const product  = await Product.findByPk(id);
    // product?.update({state: false});

    await product.update({state: false});

    return res.json({msg: 'Product deleted successfully', product});
  } catch (error) {
    return catchError({error, type: errorTypes.delete_product, res});
  }
}