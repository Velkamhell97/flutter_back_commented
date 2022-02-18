import { Request, Response } from "express";
import path from 'path';
import fs from 'fs';

import { CustomUploadedFile } from "../interfaces/uploads";
import { uploadFileLocal, uploadFileCloudinary } from "../helpers";
import { catchError, errorTypes } from "../errors";
import { UserDocument } from "../interfaces/users";
import { ProductDocument } from "../interfaces/products";
import cloudinary from "../models/cloudinary";

//->Para este caso de la libreria file upload, si debemos mover los elementos en el controlador
//-por lo que utilizamos el helper o utilidad para hacer esto
/**
 * @controller /api/uploads/ : POST
 */
export const uploadFilesLocalController = async(req: Request, res: Response) => {
  const files: CustomUploadedFile[] = [];

  //->Convertimos cada file enviado a un customUploadedFile que tiene el fieldname
  for(const key in req.files!){
    const file = req.files[key] as CustomUploadedFile;
    file.fieldname = key;
    files.push(file);
  }

  try {
    //->Subimos todos los files y devolvemos la respuesta o el error
    const uploadedFiles = await Promise.all(
      files.map(file => uploadFileLocal(file, 'users'))
    );

    //->Aqui no deseamos borrar nada ya que los archivos se mueven hacia el nuevo path con la funcion
    // deleteFilesLocal(paths)

    res.json({msg: 'Files uploaded successfully', uploadedFiles});
  } catch (error:any) {
    return catchError({
      error: error.error,
      type: errorTypes.move_local_files,
      extra: error.msg,
      res
    });
  }
}


//->Aqui los archivos no se suben al temp, sino que en la configuracion de multer se setea
//->el directiorio y nombre de los archivos, paramos por la misma funcion de validacion de los archivos
//-y una vez validados, unicamente se muestran ya que estos no toca moverlos no nombrarlos porque
//-la libreria ya tiene esta funcionalidad
/**
 * @controller /api/uploads/multer : POST
 */
 export const uploadFilesLocalMulterController = async(req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];

  const uploadedFiles = files.map<LocalUploadedFile>(file => ({fieldname: file.fieldname, name: file.filename, path: file.path}));

  res.json({msg: 'Files uploaded successfully', uploadedFiles})
}


//->Para subir archivos a cloudinary todos se almacenan primero en el temp y despues se borran (si se requiere)
//-cambian los paths dependiendo la libreria
/**
 * @controller /api/uploads/ : POST
 */
 export const uploadFilesCloudinaryController = async(req: Request, res: Response) => {
  const files: CustomUploadedFile[] = [];

  //->El mismo proceso que el de arriba 
  for(const key in req.files!){
    const file = req.files[key] as CustomUploadedFile;
    file.fieldname = key;
    files.push(file);
  }

  const files = req.files as Express.Multer.File[];

  try {
    //->Lo mismo que el local pero con cloudinary
    const uploadedFiles = await Promise.all(
      // files.map(file => uploadFileCloudinary(file.fieldname, file.tempPath, 'others')) //->file upload
      files.map(file => uploadFileCloudinary(file.fieldname, file.path, 'others'))
    );

    // deleteFilesLocal(files.map(f => f.tempPath)) //->file upload
    deleteFilesLocal(files.map(f => f.path))

    res.json({msg: 'Files uploaded successfully', uploadedFiles});
  } catch (error:any) {
    return catchError({
      error: error.error,
      type: errorTypes.upload_cloudinary,
      extra: error.msg,
      res
    });
  }
}


//->No funciona para cuando el archivo no es local, como por ejemplo una url

/**
 * @controller /api/uploads/users/:id : GET
 */
export const getUserAvatarController = async(_req: Request, res: Response) => {
   //->Iamgen cargada en los locals al validar el id de los usuarios (ahorramos un llamado a la db)
  const user: UserDocument = res.locals.user;

  //->Si hay imagen la enviamos la mostramos caso contrario mostramos una por defecto
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
 * @controller /api/uploads/products/:id : GET
 */
 export const getProductImgController = async(_req: Request, res: Response) => {
   //->Iamgen cargada en los locals al validar el id de los productos (ahorramos un llamado a la db)
   const product: ProductDocument = res.locals.product;

   //->Si hay imagen la enviamos la mostramos caso contrario mostramos una por defecto
   if(product!.img){
    const image = path.join(__dirname, '../../uploads/products', product.img);

    if(fs.existsSync(image)){
      return res.sendFile(image);
    }
  }

  const defaultImage = path.join(__dirname, '../../assets', 'no-image.jpg');
  return res.sendFile(defaultImage);
}


//->Sube un archivo local al avatar 
/**
 * @path /api/uploads/users/:id : PUT
 */
 export const uploadUserAvatarController = async(req: Request, res: Response) => {
  const files = req.files!; 
  const keys = Object.keys(files);

  //->Por la validacion del id esta en los locals, recordar que no devuelve el elemento actualizado
  const user = res.locals.user;

  //->Se convierten los archivos de diferente manera
  Promise.all([]
    // keys!.map((key) => uploadFile({[key]:files[key] as UploadedFile}, 'users'))
  ).then(async (result) => {
    //-> Se extrae el primer resultado porque solo se subira 1 archivo
    const [ file ] = result as any; //->Como solo es un file
    
    try {
      //->Si el usar tiene una imagen local anterior se forma el path y se borra
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
 export const uploadUserAvatarCloudinaryController = async(req: Request, res: Response) => {
  const files = req.files!; 
  const keys = Object.keys(files);

  const user = res.locals.user;

  //->El mismo proceso que el anterior
  Promise.all([]
    // keys!.map(key => uploadFileCloudinary({[key]: files[key] as UploadedFile}, 'users'))
  ).then(async (result) => {
    //->Prueba con el primer archivo
    const [ file ] = result as any;

    //->Si esse user ya tiene una imagen la quitamos de cloudinary
    try {
      if(user!.avatar){ //->Para cuando se hace con archivos locales (se podria quitar)
        //->Se debe especificar el folder tambien
        await cloudinary.removeImage(user.avatar, 'users');
      }

      //->Luego si asignamos la nueva url
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

//->Para las ultimas dos funciones aplica lo mismo para los products