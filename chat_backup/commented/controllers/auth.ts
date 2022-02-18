import { Request, Response } from "express"
import { Document } from "mongoose";

import { generateJWT, googleVerify } from "../../helpers";
import { User } from "../../models";


/**
 * @path /auth/renew : GET
 */
export const renewTokenController = async (_req: Request, res: Response) => {
  const authUser : Document = res.locals.authUser;
  
  await authUser.populate('role', 'role')

  generateJWT(authUser.id).then((token) => {
    res.json({
      msg: 'Token renew',
      user: authUser,
      token
    })
  }).catch((error) => {
    console.log(error);
    return res.status(500).json({
      msg: 'Error when renwe token',
      error
    })
  })
}


/**
 * @path /api/auth/login : POST
 */
export const loginController = async (_req: Request, res: Response) => {
  //->Se toma el correo que se valido en el login
  const user : Document = res.locals.user
  
  await user.populate('role', 'role')
  
  generateJWT(user.id).then((token) => {
    res.json({
      msg: 'Login successfully',
      user,
      token
    })
  }).catch((error) => {
    return res.status(500).json({
      msg: 'Error when generate token',
      error
    })
  })
}


/**
 * @path /api/auth/google : POST
 */
 export const googleSignInController = async (req: Request, res: Response) => {
  //-Viene del front al pasar el singn in del boton de google
  const { id_token } = req.body;

  try {
    //->Se toman los campos deseados
    const {name, email, picture} = await googleVerify(id_token);

    let user = await User.findOne({email});

    //->Si no hay usuario con ese correo, se crea, caso contrario solo se devuelve
    if(!user) {
      //->Si crea la cuenta en google, no podra registrarse normalmente ya que en la validacion del login
      //-no se permiten contraseñas tan cortas
      user = new User({name, email, password:'any', avatar: picture, google: true, role: "61fb0e905b08de3f3579fd0b"})

      await user.save();
    }

    //->Si el usuario existe pero esta con estado en false
    if(!user.state) {
      return res.status(401).json({
        error: 'User block',
        msg: 'This user was blocked from the database',
        user
      })
    }

    await user.populate('role', 'role');

    //->Despues de crear el usuario podemos generar el jwt para el autenticado
    generateJWT(user.id).then((token) => {
      return res.json({
        msg: 'Google sign in successfully',
        user,
        token
      })
    }).catch((error) => {
      return res.status(500).json({
        msg: 'Error when generate token',
        error
      })
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      msg: 'Google sign in error',
      error
    })
  }
}
