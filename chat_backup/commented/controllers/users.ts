import bcryptjs from 'bcryptjs';

import cloudinary from "../../models/cloudinary";
import { generateJWT } from "../../helpers";
import { User } from '../../models';
import { UsersRequest, UsersResponse } from "../../interfaces/users";
import { catchError, errorTypes } from '../../errors';

/**
 * @path /api/users/ : GET
 */
export const getUsersController = async (req: UsersRequest, res: UsersResponse) => {
  const { limit = 5, from = 0 } = req.query;
  const query = { state: true };

  try {
    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).populate('role','role').skip(Number(from)).limit(Number(limit))
    ]);
  
    res.json({
      msg: 'Users get successfully',
      total: total,
      users,
      count: users.length,
    });
  } catch (error) {
    catchError({error, type: errorTypes.get_users, res});
  }
}


/**
 * @path /api/users/:id : GET 
 */
 export const getUserByIdController = async (_req: UsersRequest, res: UsersResponse) => {
  //->User cargado en el validate user - (GETBYID, GETUSERCATEGORIES)
  const user = res.locals.user;

  res.json({
    msg: 'Users by ID get successfully',
    user
  });
}


/**
 * @path /api/users/:id/categories : GET
 */
 export const getUserCategoriesController = async (_req: UsersRequest, res: UsersResponse) => {
  const user = res.locals.user;

  try {
    //->Se utiliza el de los res en vez del FindById para no hacer otro llamado a la db, otras opciones en old
    const { categories } = await user.populate({
      path: 'categories', 
      match: { state: true },
    }) as { categories: any };
    //->Como los virtuals no existen en el documento sino que son objetos JSON, no podemos tiparlos, por esta razon
    //si se quiere desestructurar se debe hacer un tipado auxiliar
    
    res.json({
      msg: 'User categories get successfully',
      categories
    })
  } catch (error) {
    catchError({error, type: errorTypes.get_user_categories, res});
  }
}


/**
 * @path /api/users/ : POST
 */
export const createUserController = async (req: UsersRequest, res: UsersResponse) => {
  //->Se extraen los campos que no deben ser manipulados en el body - (CREATE, UPDATE)
  const { state,...userData } = req.body;
  
  //->Cuando es por medio de un formdata, los files se guardan aparte del body, el avatar del body es undefined
  const avatar = res.locals.avatar; 
  
  const salt = bcryptjs.genSaltSync();
  const hashPassword = bcryptjs.hashSync(userData.password!, salt);
  
  userData.password = hashPassword;

  //->Por el middleware del role, este se asgina al body (su id), quedando en el rest (CREATE - UPDATE)
  //->De igual manera el avatar al ser un file no viene en el body (undefined) evitando errores
  const user = new User(userData);

  //->Se guarda despues de generar el id para guardarlo con esa referencia (es opcional que tenga imagen)
  if(avatar){
    try {
      const response = await cloudinary.uploadImage({path: avatar.tempFilePath, filename: user.id, folder: 'users'});
      user.avatar = response.secure_url;
    } catch (error) {
      //->Named arguments
      catchError({error, type: errorTypes.upload_cloudinary, res});
    }
  }

  try {
    await user.save();
    await user.populate('role', 'role')

    generateJWT(user.id).then((token) => {
      return res.json({
        msg: 'User saved successfully',
        user,
        token
      })
    }).catch((error) => {
      catchError({error, type: errorTypes.generate_jwt, res});
    })
  } catch (error) {
    catchError({error, type: errorTypes.save_user, res});
  }
}


/**
 * @path /api/users/:id : PUT
 */
export const updateUserController = async (req: UsersRequest, res: UsersResponse) => {
  const { id } = req.params;
  const { state, ...userData } = req.body;

  const oldUser = res.locals.user;
  const avatar = res.locals.avatar;

  //->Si se pasa el password se actualiza
  if(userData.password){
    const salt = bcryptjs.genSaltSync();
    const hashPassword = bcryptjs.hashSync(userData.password, salt);

    userData.password = hashPassword;
  }

  if(avatar){
    try {
      const response = await cloudinary.uploadImage({path: avatar.tempFilePath, filename:id, folder: 'users'});
      userData.avatar = response.secure_url;
    } catch (error) {
      catchError({error, type: errorTypes.upload_cloudinary, res})
    }
  }

  try {
    //->Mas legible, no el mas rapido, se pueden ver otras opciones en el old - (UPDATE, DELETE)
    const user = await User.findByIdAndUpdate(id, userData, {new: true}).populate('role', 'role');

    return res.json({
      msg: 'User update successfully',
      user
    })
  } catch (error) {
    catchError({error, type: errorTypes.update_user, res})
  }
}


/**
 * @path /api/users/:id : DELETE
 */
export const deleteUserController = async (req: UsersRequest, res: UsersResponse) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndUpdate(id, {state: false}, {new: true}).populate('role', 'role');

    return res.json({
      msg: 'User delete successfully',
      user
    })
  } catch (error) {
    catchError({error, type: errorTypes.delete_user, res})
  }
}

