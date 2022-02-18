import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator/src/validation-result";

import { catchError, errorTypes } from "../../errors";
import { Role, User } from "../../models";
import { verifyJWT } from "../../helpers";
import { UserDocument } from "../../interfaces/users";


/**
 * @middleware validate jwt header (return auth user)
 */
export const validateJWT = (req : Request, res : Response, next: NextFunction) => {
  const token = req.header('x-token');

  if(!token){
    return catchError({type: errorTypes.no_token, res});
  }

  //->Del jwt se valida el usuario y se coloca en el authUser
  verifyJWT(token).then(async (payload) => {
    const authUser = await User.findById(payload.uid);

    if(!authUser || authUser.state == false){
      return catchError({type: errorTypes.auth_user_not_found, res});
    }

    //->Aqui no se necesita crearse una interfaz aparte ya que no se utiliza para nada mas que para asignarse
    res.locals.authUser = authUser
    
    next();
  }).catch((error) => {
    return catchError({error, type: errorTypes.invalid_token, res});
  })
}


/**
 * @middleware validate body schemas
 */
export const validateBody = (req : Request, res : Response, next: NextFunction) => {
  //->Valida los schemas del body
  const errors = validationResult(req);
  
  if(!errors.isEmpty()) {
    return res.status(400).json(errors)
  }

  next();
}


/**
 * @middleware validate user permissions
 */
export const validatePermissions = async (_req : Request, res : Response, next: NextFunction) => {
  //-> Valida que el usuario autenticado tenga los permisos requeridos
  const authUser: UserDocument = res.locals.authUser;

  //->Como se utiliza en mas rutas se podria pasar este arreglo como argumento
  const validRoles = ['ADMIN_ROLE', 'WORKER_ROLE'];

  const authUserRole = await Role.findById(authUser.role);

  if(!authUserRole || !validRoles.includes(authUserRole.role)){
    return catchError({
      type: errorTypes.permissions,
      extra: `Only the roles: ${validRoles} can modify registers, actual role: ${authUserRole!.role}`,
      res
    });
  } 

  next();
}

/**
 * @middleware validate user avatar (create and update valid)
 */
 export const validateSingleFile = (field: string, extensions: string[]) => async(req: Request, res: Response, next: NextFunction) => {
  //->En el file upload checkeamos la existencia del archivo requerido de una forma diferente al de multer
  //->porque son diferentes objetos sin embargo no es mucha diferencia, 
  // const files: CustomUploadedFile[] = [];

  // for(const key in req.files!){
  //   const file = req.files[key] as CustomUploadedFile;
  //   file.fieldname = key;
  //   files.push(file);
  // }

  const files = req.files as Express.Multer.File[] | undefined; //->multer  

  //->el errorhandlre de multer puede validar que no se envien, mas archivos de los esperados o con diferentes fields
  //->pero esto implica manejar crear mas funciones en la ruta y aumentar la complejidad, asi que se utilizara
  //->esta alternativa propia, que funciona para ambas librerias

  //->Si no vienen files quiere decir que no se desea subir o actualizar nada, pasamos el next
  if(!files || !files.length){
    return next();
  } 

  //->otra validacion para un archivo unico, si viene mas de un field o el unico que viene no incluye a
  //->requerido arroja error
  if(files.length > 1 || files[0].fieldname != field){ //->multer y file upload
    deleteFilesLocal(files.map(f => f.path));

    return catchError({
      type: errorTypes.missing_files,
      extra: `The file \'${field}\' was expected, recibed: ${files.map(f => f.fieldname)}`,
      res
    })
  }

  const file = files[0];

  // const ext = file.name.split('.').at(-1)!;
  const ext = file.originalname.split('.').at(-1)!;

  if(!extensions.includes(ext)){
    deleteFilesLocal([file.path]);

    return catchError({
      type: errorTypes.invalid_file_extension,
      extra: `The file \'${field}\' have an invalid extension, valid extensions: ${extensions}`,
      res
    });
  } else {
    //->para no volver a hacer la validacion de los files en el controller, si no envia llegara undefined
    // res.locals.avatar = avatar;
    res.locals.file = file;
  }

  next();
}