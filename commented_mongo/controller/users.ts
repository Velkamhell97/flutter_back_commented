import { Response } from 'express';
import bcryptjs from 'bcryptjs';

import { catchError, errorTypes } from '../errors';
import { generateJWT } from "../helpers";
import { User } from '../models';
import { UserDocument, UsersRequest } from "../interfaces/users";
import cloudinary from "../models/cloudinary";
import { UploadedFile } from 'express-fileupload';


/**
 * @controller /api/users/ : GET
 */
export const getUsersController = async (req: UsersRequest, res: Response) => {
  const { limit = 5, from = 0 } = req.query;
  const query = { state: true };

  try {
    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).populate('role','role').skip(Number(from)).limit(Number(limit))
    ]);
  
    res.json({msg: 'Users get successfully', total, users, count: users.length});
  } catch (error) {
    return catchError({error, type: errorTypes.get_users, res});
  }
}


/**
 * @controller /api/users/:id : GET 
 */
 export const getUserByIdController = async (_req: UsersRequest, res: Response) => {
  //->User cargado en el validate user - (GETBYID, GETUSERCATEGORIES)
  const user: UserDocument = res.locals.user;
  await user.populate('role', 'role');

  res.json({msg: 'Users by ID get successfully', user});
}


/**
 * @controller /api/users/:id/categories : GET
 */
 export const getUserCategoriesController = async (_req: UsersRequest, res: Response) => {
  const user: UserDocument = res.locals.user;

  try {
    //->Se utiliza el de los res en vez del FindById para no hacer otro llamado a la db, otras opciones en old
    const { categories } = await user.populate({path: 'categories', match: {state: true}}) as any;
    //->Como los virtuals no existen en el documento sino que son objetos JSON, no podemos tiparlos, por esta razon
    //si se quiere desestructurar se debe hacer un tipado auxiliar
    
    res.json({msg: 'User categories get successfully', categories});
  } catch (error) {
    return catchError({error, type: errorTypes.get_user_categories, res});
  }
}


/**
 * @controller /api/users/ : POST
 */
export const createUserController = async (req: UsersRequest, res: Response) => {
  //->Para la forma 2 tengo que separar el avatar porque el form data sube todo al body
  // const { state, avatar,...userData } = req.body;
  
  //->Se extraen los campos que no deben ser manipulados en el body - (CREATE, UPDATE)
  const { state,...userData } = req.body;

  // const avatar = res.locals.avatar; //->Con la forma 1, 

  //->Forma 1: subir el archivo con un id autogenerado
  //->Si hay avatar se sube a cloudinary, un try aparte para mostrar un error diferente
  // if(avatar){
  //   try {
  //     const response = await cloudinary.uploadImage(avatar.tempFilePath, 'users');
  //     userData.avatar = response.secure_url;
  //   } catch (error) {
  //     console.log(error);
    
  //     return res.status(500).json({
  //       msg: 'Error while upload avatar',
  //       error,
  //     })
  //   }
  // }

  // const avatar: Express.Multer.File | undefined = res.locals.file; //->multer
  
  // if(avatar){
  //   try {
  //     const response = await cloudinary.uploadImage({path: avatar.path, filename: user.id, folder: 'users'});
  //     //->Borrar el archivo local una vez se sube, no muy necesario cuando se guarda en el temp
  //     //->ya que este mismo se encarga de ir borrando archvos a medida que necesita espacio
  //     //->Se puede limitar el tamaño de los archivos y la cantidad en las opciones del multer
  //     // deleteFilesLocal([avatar.path]) 
  //     user.avatar = response.secure_url;
  //   } catch (error) { 
  //     return catchError({error, type: errorTypes.upload_cloudinary, res});
  //   }
  // }
  
  const salt = bcryptjs.genSaltSync();
  const hashPassword = bcryptjs.hashSync(userData.password!, salt);
  userData.password = hashPassword;

  //->Por el middleware del role, este se asgina al body (su id), quedando en el rest (CREATE - UPDATE)
  //->De igual manera el avatar al ser un file no viene en el body (undefined) evitando errores
  const user = new User(userData);  

  //->Cuando es por medio de un formdata, los files se guardan aparte del body, el avatar del body es undefined
  const avatar: UploadedFile | undefined = res.locals.avatar; 
 
  //->Forma:2, se asigna el id del usuario para mantener su referencia unica, error aparte
  if(avatar){
    try {
      const response = await cloudinary.uploadImage({path: avatar.tempFilePath, filename: user.id, folder: 'users'});
      user.avatar = response.secure_url;
    } catch (error) { 
      return catchError({error, type: errorTypes.upload_cloudinary, res});
    }
  }

  try {
    await (await user.save()).populate('role', 'role');

    generateJWT(user.id).then((token) => {
      return res.json({msg: 'User saved successfully', user, token});
    }).catch((error) => {
      return catchError({error, type: errorTypes.generate_jwt, res});
    })
  } catch (error) {
    return catchError({error, type: errorTypes.save_user, res});
  }
}


/**
 * @controller /api/users/ : POST
 */
 export const createUserWithTransactionController = async (req: UsersRequest, res: Response) => {
  const { state,...userData } = req.body;
  
  const salt = bcryptjs.genSaltSync();
  const hashPassword = bcryptjs.hashSync(userData.password!, salt);
  userData.password = hashPassword;

  const session = await User.startSession();

  //->Ejemplo de como crear la transaccion, supongamos que para obtener el id priero debemos crear el usuario
  //en la db, es decir realizar una operacion de creacion, entonces lo que hacemos es crear el id con los datos
  //excepto con los de la imagen (ya que necesitamos el id del usuairo creado)
  session.withTransaction(async () => {
    const user = new User(userData); 

    //-creamos el registro para obtener el id
    await user.save({session});

    const avatar: Express.Multer.File | undefined = res.locals.file; //->multer
    
    //ahora una vez con el id podemos subir la imagen a cloudinary con este como identificador (si viene)
    if(avatar){
      try {
        //-La transaccion no borrara el archivo de cloudinary pero al tener el mismo id, lo podemos
        //-sobreescribir si se vuelve a intentar
        const response = await cloudinary.uploadImage({path: avatar.path, filename: user.id, folder: 'users'});
        user.avatar = response.secure_url;
      } catch (error) { 
        //si falla la subida de la imagen se revertira el proceso de creacion en la db
        throw {error, type: errorTypes.upload_cloudinary};
        // return catchError({error, type: errorTypes.upload_cloudinary, res});
      }
    }

    //ahora que tenemos la imagen podemos actualizar con el nuevo url (con el save para devolver el actualizado)
    await (await user.save({session})).populate('role', 'role');
    
    //-Error generado para probar el rollback del transaction
    throw 'error'
    //-Es cuestion del desarrollador determinar si cuando ocurre un problema al generar un jwt tambien
    //-debe revertir los cambios o al mantener al usuario
    generateJWT(user.id).then((token) => {
      return res.json({msg: 'User saved successfully', user, token});
    }).catch((error) => {
      //->El unico problema es que no se pueden distingir por completo los errors
      throw {error, type: errorTypes.generate_jwt};
      // return catchError({error, type: errorTypes.generate_jwt, res});
    })
  }).catch(error => {
    return catchError({error, type: errorTypes.save_user, res});
  });
}


/**
 * @controller /api/users/:id : PUT
 */
export const updateUserController = async (req: UsersRequest, res: Response) => {
  const { id } = req.params;
  const { state, ...userData } = req.body;


  if(userData.password){
    const salt = bcryptjs.genSaltSync();
    const hashPassword = bcryptjs.hashSync(userData.password, salt);
    userData.password = hashPassword;
  }

  const avatar: UploadedFile | undefined = res.locals.avatar;
  // const oldUser = res.locals.user;

  //->Forma 1: se borra el anterior autogenerado y se crea uno nuevo
  //->Si envia avatar lo actualiza, si tiene avatar viejo lo borra pero antes borra el anterior (si tiene)
  // if(avatar){
  //   try {
  //     if(oldUser.avatar){
  //       await cloudinary.removeImage(oldUser.avatar, 'users');
  //     }

  //     const response = await cloudinary.uploadImage(avatar.tempFilePath, 'users');
  //     userData.avatar = response.secure_url;
  //   } catch (error) {
  //     console.log(error);
    
  //     return res.status(500).json({
  //       msg: 'Error while upload avatar',
  //       error,
  //     })
  //   }
  // }


  //->Forma 2: ya tenemos el id solo sobreescribirmos la imagen
  if(avatar){
    try {
      const response = await cloudinary.uploadImage({path: avatar.tempFilePath, filename: id, folder: 'users'});
      userData.avatar = response.secure_url;
    } catch (error) {
      return catchError({error, type: errorTypes.upload_cloudinary, res});
    }
  }

  // const avatar: Express.Multer.File | undefined = res.locals.file; //->muller

  // if(avatar){
  //   try {
  //     const response = await cloudinary.uploadImage({path: avatar.path, filename: id, folder: 'users'});
  //     // deleteFilesLocal([avatar.path]) 
  //     userData.avatar = response.secure_url;
  //   } catch (error) { 
  //     return catchError({error, type: errorTypes.upload_cloudinary, res});
  //   }
  // }

  try {
    //->Mas legible, no el mas rapido, se pueden ver otras opciones en el old - (UPDATE, DELETE)
    const user = await User.findByIdAndUpdate(id, userData, {new: true}).populate('role', 'role');

    return res.json({msg: 'User update successfully', user});
  } catch (error) {
    return catchError({error, type: errorTypes.update_user, res});
  }
}


/**
 * @controller /api/users/:id : PUT
 */
 export const updateUserWithTransactionController = async (req: UsersRequest, res: Response) => {
  const { id } = req.params;
  const { state, ...userData } = req.body;

  if(userData.password){
    const salt = bcryptjs.genSaltSync();
    const hashPassword = bcryptjs.hashSync(userData.password, salt);
    userData.password = hashPassword;
  }

  const avatar: Express.Multer.File | undefined = res.locals.file; 

  if(avatar){
    try {
      const response = await cloudinary.uploadImage({path: avatar.path, filename: id, folder: 'users'});
      // deleteFilesLocal([avatar.path]) 
      userData.avatar = response.secure_url;
    } catch (error) { 
      return catchError({error, type: errorTypes.upload_cloudinary, res});
    }
  }

  const session = await User.startSession();
  
  session.withTransaction(async() => {
    //-Para el caso de los updates para no utilizar el save({session}), el propio metodo recibe una session
    const user = await User.findByIdAndUpdate(id, userData, { new: true, session: session });

    //-En caso de un erro en la transaccion se revierten los updates
    throw 'error';
    
    return res.json({msg: 'User update successfully', user});
  }).catch(error => {
    return catchError({error, type: errorTypes.update_user, res});
  })
}


/**
 * @controller /api/users/:id : DELETE
 */
export const deleteUserController = async (req: UsersRequest, res: Response) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndUpdate(id, {state: false}, {new: true}).populate('role', 'role');

    return res.json({msg: 'User delete successfully', user});
  } catch (error) {
    return catchError({error, type: errorTypes.delete_user, res});
  }
}

