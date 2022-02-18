import { Response, NextFunction } from 'express';

import { Role, User } from '../../models';
import { UsersRequest } from '../../interfaces/users';
import { catchError, errorTypes } from '../../errors';
import { UploadedFile } from 'express-fileupload';




/**
 * @middleware validate user id passed by params
 */
 export const validateUserID = async (req: UsersRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const dbUser = await User.findById(id);

  if(!dbUser || !dbUser.state){
    return catchError({type: errorTypes.user_not_found, res});
  } else {
    //->Se carga en el locals para no hacer otra llamada a la db - (userById, userCategories, createUser, deleteUser)
    res.locals.user = dbUser; 
  }

  next();
}


/**
 * @middleware validate user email (create and update valid)
 */
 export const validateEmail = async (req: UsersRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { email } = req.body;

  //->Si se crea o se actualiza se verifica que este disponible, si no se actualiza salta la validacion
  if(!email){
    return next();
  }

  //->Que haya un email igual en la db y que su id sea diferente al que se actualiza
  const dbUser = await User.findOne({email, _id: {$ne: id}});

  if(dbUser){
    return catchError({
      type: errorTypes.duplicate_email,
      extra: `The email ${email} is already in use`,
      res
    });
  }

  next();
}


/**
 * @middleware validate user role (create and update valid)
 */
export const validateRole = async (req: UsersRequest, res: Response, next: NextFunction) => {
  const { role } = req.body;

  if(!role) {
    return next();
  }
  
  const dbRole = await Role.findOne({role});

  if(!dbRole){
    return catchError({
      type: errorTypes.role_not_found,
      extra: `The role with the name \'${role}\' does not exist in the database`,
      res
    });
  } else {
    //->Se reemplaza el texto del body por el id para ahorrar una llamada a la db - (createUser, updateUser)
    req.body.role = dbRole.id;
  }

  next();
}


/**
 * @middleware validate user avatar (create and update valid)
 */
export const validateAvatar = async(req: UsersRequest, res: Response, next: NextFunction) => {
  //->Como es opcional el avatar debemos hacer la validacion personalizada
  const files = req.files;

  //->El tipado personalizado hace necesaria este tipo de validacion, se pudiera manejar tambien con el tipado por defecto
  if(!files?.avatar){
    return next();
  }

  //-> Para no crear una interface para los files, se puede establecer si se espera 1 archivo o varios
  // const avatar = files.avatar as UploadedFile;

  const avatar = files.avatar as UploadedFile;
  const extensions = ['jpg', 'jpeg', 'png'];

  //->Puede que no tenga ese indice, pero nosotros sabemos que si tiene que tener al menos 1
  const ext = avatar.name.split('.').at(-1)!;

  if(!extensions.includes(ext)){
    return catchError({
      type: errorTypes.invalid_file_extension,
      extra: `The file \'avatar\' have an invalid extension, valid extensions: ${extensions}`,
      res
    });
  } else {
    //->Para no hacer la validacion del files en el controllador
    res.locals.avatar = avatar;
  }
    
  next();
}   