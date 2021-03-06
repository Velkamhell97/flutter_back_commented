import { Request, Response } from "express"

import { AuthRequest } from "../interfaces/auth";
import { catchError, errorTypes } from "../errors";
import { generateJWT, googleVerify } from "../helpers";
import { User } from "../models";
import { UserDocument } from "../interfaces/users";

/**
 * @controller /auth/renew : GET
 */
export const renewTokenController = async (_req: AuthRequest, res: Response) => {
  const user: UserDocument = res.locals.logedUser;
  await user.populate('role', 'role');

  generateJWT(user.id).then((token) => {
    res.json({msg: 'Token renew', user, token});
  }).catch((error) => {
    return catchError({error, type: errorTypes.generate_jwt, res});
  })
}


/**
 * @controller /api/auth/login : POST
 */
export const loginController = async (_req: AuthRequest, res: Response) => {
  //->Se toma el correo que se valido en el login
  const user: UserDocument = res.locals.logedUser;
  await user.populate('role', 'role');
  
  generateJWT(user.id).then((token) => {
    res.json({msg: 'Login successfully', user, token});
  }).catch((error) => {
    return catchError({error, type: errorTypes.generate_jwt, res});
  })
}


/**
 * @controller /api/auth/google : POST
 */
 export const googleSignInController = async (req: Request, res: Response) => {
  const { id_token } = req.body;

  try {
    const {name, email, picture} = await googleVerify(id_token);

    let user = await User.findOne({email});

    if(!user) {
      //-Si crea la cuenta en google, no podra registrarse normalmente ya que en la validacion del login
      //-no se permiten contraseñas tan cortas
      user = new User({name, email, password:'any', avatar: picture, google: true, role: "61fb0e905b08de3f3579fd0b"});
      await user.save();
    }

    if(!user.state) {
      return catchError({error: user, type:errorTypes.user_blocked, res});
    }

    await user.populate('role', 'role');

    generateJWT(user.id).then((token) => {
      return res.json({msg: 'Google sign in successfully', user, token})
    }).catch((error) => {
      return catchError({error, type: errorTypes.generate_jwt, res});
    })
  } catch (error) {
    return catchError({error, type: errorTypes.google_signin, res});
  }
}
