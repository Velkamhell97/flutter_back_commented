import { NextFunction } from "express";
import { validationResult } from "express-validator/src/validation-result";

import { verifyJWT } from "../../../helpers";
import { AuthRequest, AuthResponse } from "../../../interfaces/auth";
import { Role, User } from "../../../models";


/**
 * @Middleware validate jwt header (return auth user)
 */
export const validateJWT = (req : AuthRequest, res : AuthResponse, next: NextFunction) => {
  const token = req.header('x-token');

  if(!token){
    return res.status(401).json({
      msg: 'There is not token in request',
      error: 'Invalid token',
    })
  }

  //->Del jwt se valida el usuario y se coloca en el authUser
  verifyJWT(token).then(async (payload) => {
    const authUser = await User.findById(payload.uid);

    if(!authUser || authUser.state == false){
      return res.status(401).json({
        msg: `Auth user not found in database`,
        error: 'Invalid token',
      })
    }

    //->Aqui no se necesita crearse una interfaz aparte ya que no se utiliza para nada mas que para asignarse
    res.locals.authUser = authUser
    
    next();
  }).catch((error) => {
    console.log(error);

    return res.status(401).json({
      msg: 'Token expired or unsigned',
      error: 'Invalid token',
    })
  })
}


/**
 * @Middleware validate body schemas
 */
export const validateBody = (req : AuthRequest, res : AuthResponse, next: NextFunction) => {
  //->Valida los schemas del body
  const errors = validationResult(req);
  
  if(!errors.isEmpty()) {
    return res.status(400).json(errors)
  }

  next();
}


/**
 * @Middleware validate user permissions
 */
export const validatePermissions = async (_req : AuthRequest, res : AuthResponse, next: NextFunction) => {
  //-> Valida que el usuario autenticado tenga los permisos requeridos
  const authUser = res.locals.authUser;

  //->Como se utiliza en mas rutas se podria pasar este arreglo como argumento
  const validRoles = ['ADMIN_ROLE', 'WORKER_ROLE'];

  const authUserRole = await Role.findById(authUser.role);

  if(!authUserRole || !validRoles.includes(authUserRole.role)){
    return res.status(401).json({
      msg: `Only the roles: ${validRoles} can delete, actual role: ${authUserRole!.role}`,
      error: 'Permissions denied',
    })
  } 

  next()
}