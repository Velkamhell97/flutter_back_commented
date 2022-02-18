import bcryptjs from 'bcryptjs';

import cloudinary from "../../models/cloudinary";
import { generateJWT } from "../../helpers";
import { User } from '../../models';
import { UsersRequest, UsersResponse } from "../../interfaces/users";

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
    ])
  
    res.json({
      msg: 'Users get successfully',
      total: total,
      users,
      count: users.length,
    })
  } catch (error) {
    console.log(error);
    
    return res.status(500).json({
      msg: 'User get failed',
      error,
    })
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
  })
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
    console.log(error);
    
    return res.status(500).json({
      msg: 'User categories failed',
      error,
    })
  }
}


/**
 * @path /api/users/ : POST
 */
export const createUserController = async (req: UsersRequest, res: UsersResponse) => {
  //->Se extraen los campos que no deben ser manipulados en el body - (CREATE, UPDATE)
  //->Para la forma 2 tengo que separar el avatar porque el form data sube todo al body
  const { state, avatar,...userData } = req.body;
  // const avatar = res.locals.avatar; //->Con la forma 1, 

  console.log(avatar);
  
  const salt = bcryptjs.genSaltSync();
  const hashPassword = bcryptjs.hashSync(userData.password!, salt);
  
  userData.password = hashPassword;

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
    
  try {
    //->Por el middleware del role, este se asgina al body (su id), quedando en el rest (CREATE - UPDATE)
    const user = new User(userData);

    const file = res.locals.avatar;

    console.log(file);

    //->Forma:2, se asigna el id del usuario para mantener su referencia unica, error aparte
    if(file){
      try {
        const response = await cloudinary.uploadImageOverride(file.tempFilePath, user.id, 'users');
        user.avatar = response.secure_url;
      } catch (error) {
        console.log(error);
      
        return res.status(500).json({
          msg: 'Error while upload avatar',
          error,
        })
      }
    }

    await user.save();
    await user.populate('role', 'role')

    generateJWT(user.id).then((token) => {
      return res.json({
        msg: 'User saved successfully',
        user,
        token
      })
    }).catch((error) => {
      console.log(error);
      return res.status(400).json(error)
    })
  } catch (error) {
    console.log(error);
    
    return res.status(500).json({
      msg: 'User saved failed',
      error,
    })
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
      const response = await cloudinary.uploadImageOverride(avatar.tempFilePath, id,'users');
      userData.avatar = response.secure_url;
    } catch (error) {
      console.log(error);
    
      return res.status(500).json({
        msg: 'Error while upload avatar',
        error,
      })
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
    console.log(error);
    
    return res.status(500).json({
      msg: 'User update failed',
      error
    })
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
    console.log(error);
    
    return res.status(500).json({
      msg: 'User delete failed',
      error
    })
  }
}

