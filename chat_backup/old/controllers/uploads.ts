import { Request, Response } from "express";
import path from 'path';
import fs from 'fs';

import { uploadFile, uploadFileCloudinary } from "../../helpers";
import cloudinary from "../../models/cloudinary";
import { UsersRequest, UsersResponse } from "../../interfaces/users";
import { ProductsRequest, ProductsResponse } from "../../interfaces/products";
import { UploadedFile } from "express-fileupload";

/**
 * @path /api/uploads/ : POST
 */
export const uploadFilesController = async(req: Request, res: Response) => {
  const files = req.files!; 
  const keys = Object.keys(files);

  //->Si no se pasa el folder queda en la raiz de la carpeta uploads
  Promise.all(
    //->Devolvemos un objeto con el nombre del file en el request para retornar esta referencia en caso de error
    keys!.map((key) => uploadFile({[key]: files[key] as UploadedFile}, 'others'))
  ).then(result => {
    res.json({
      msg: 'Files uploaded successfully',
      result
    });
  }).catch(error => res.status(500).json(error))
}

/**
 * @path /api/uploads/ : POST
 */
 export const uploadFilesCloudinaryController = async(req: Request, res: Response) => {
  const files = req.files!; 
  const keys = Object.keys(files);

  Promise.all(
    keys!.map((key) => uploadFileCloudinary({[key]: files[key] as UploadedFile}, 'others'))
  ).then(result => {
    res.json({
      msg: 'Files uploaded successfully',
      result
    });
  }).catch(error => res.status(500).json(error))
}

/**
 * @path /api/uploads/users/:id : GET
 */
export const getUserAvatarController = async(_req: UsersRequest, res: UsersResponse) => {
  const user = res.locals.user;

  if(user!.avatar){
    const avatar = path.join(__dirname, '../../uploads/users', user.avatar);

    if(fs.existsSync(avatar)){
      return res.sendFile(avatar);
    }
  }

  const defaultImage = path.join(__dirname, '../../assets', 'no-image.jpg');
  return res.sendFile(defaultImage);
}


/**
 * @path /api/uploads/users/:id : PUT
 */
export const uploadUserAvatarController = async(req: UsersRequest, res: UsersResponse) => {
  const files = req.files!; 
  const keys = Object.keys(files);

  //->Por la validacion del id esta en los locals, recordar que no devuelve el elemento actualizado
  const user = res.locals.user;

  Promise.all(
    keys!.map((key) => uploadFile({[key]:files[key] as UploadedFile}, 'users'))
  ).then(async (result) => {
    //-> Se extrae el primer resultado porque solo se subira 1 archivo
    const [ file ] = result as any;

    try {
      if(user!.avatar){
        const oldImage = path.join(__dirname, '../../uploads/users', user.avatar);

        //->Con el fs se hacen operaciones con los archivos, si existe la imagen en el user y en el folder la borra
        if(fs.existsSync(oldImage)){
          fs.unlinkSync(oldImage)
        }
      }

      //->En este caso si es mejor el user del locals que el del FindById porque solo se cambia 1 campo
      user.avatar = file.name;
      await user.save();

      res.json({
        msg: 'User avatar successfully upload',
        //->Podriamos devolver solo el path de guardado
        user
      });
    } catch (error) {
      res.status(500).json({
        msg:'Error while update user avatar',
        error
      })
    }
  }).catch(error => res.status(500).json(error))
}


/**
 * @path /api/uploads/users/:id : PUT
 */
 export const uploadUserAvatarCloudinaryController = async(req: UsersRequest, res: UsersResponse) => {
  const files = req.files!; 
  const keys = Object.keys(files);

  const user = res.locals.user;

  Promise.all(
    keys!.map(key => uploadFileCloudinary({[key]: files[key] as UploadedFile}, 'users'))
  ).then(async (result) => {
    const [ file ] = result as any;

    try {
      if(user!.avatar){ //->Para cuando se hace con archivos locales (se podria quitar)
        //->Se debe especificar el folder tambien
        await cloudinary.removeImage(user.avatar, 'users');
      }

      user.avatar = file.data.secure_url
      await user.save();

      res.json({
        msg: 'User avatar successfully upload',
        user
      });
    } catch (error) {
      res.status(500).json({
        msg:'Error while update user avatar',
        error
      })
    }
  }).catch(error => res.status(500).json(error))
}


/**
 * @path /api/uploads/products/:id : GET
 */
 export const getProductImgController = async(_req: ProductsRequest, res: ProductsResponse) => {
  const product = res.locals.product;

  if(product!.img){
    const image = path.join(__dirname, '../../uploads/products', product.img);

    if(fs.existsSync(image)){
      return res.sendFile(image);
    }
  }

  const defaultImage = path.join(__dirname, '../../assets', 'no-image.jpg');
  return res.sendFile(defaultImage);
}


/**
 * @path /api/uploads/products/:id : PUT
 */
export const uploadProductImgController = async(req: ProductsRequest, res: ProductsResponse) => {
  const files = req.files!; 
  const keys = Object.keys(files);

  const product = res.locals.product;

  Promise.all(
    keys!.map((key) => uploadFile({[key]:files[key] as UploadedFile}, 'products')) 
  ).then(async (result) => {
    const [ file ] = result as any;
    
    try {
      if(product!.img){ 
        const oldImage = path.join(__dirname, '../../uploads/products', product.img);

        if(fs.existsSync(oldImage)){
          fs.unlinkSync(oldImage)
        }
      }

      product.img = file.name;
      await product.save();

      res.json({
        msg: 'Product image successfully upload',
        product
      });
    } catch (error) {
      res.status(500).json({
        msg:'Error while update product image',
        error
      })
    }
  }).catch(error => res.status(500).json(error))
}


/**
 * @path /api/uploads/products/:id : PUT
 */
 export const uploadProductImgCloudinaryController = async(req: ProductsRequest, res: ProductsResponse) => {
  const files = req.files!; 
  const keys = Object.keys(files);

  const product = res.locals.product;

  Promise.all(
    keys!.map(key => uploadFileCloudinary({[key]: files[key] as UploadedFile}, 'products'))
  ).then(async (result) => {
    const [ file ] = result as any;
    
    try {
      if(product!.img){
        await cloudinary.removeImage(product.img, 'products');
      }

      product.img = file.data.secure_url;
      await product.save();

      res.json({
        msg: 'Product image successfully upload',
        product
      });
    } catch (error) {
      res.status(500).json({
        msg:'Error while update product image',
        error
      })
    }
  }).catch(error => res.status(500).json(error))
}