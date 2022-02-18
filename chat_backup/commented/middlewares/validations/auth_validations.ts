import { NextFunction } from 'express';
import bcryptjs from 'bcryptjs';

import { User } from '../../../models';
import { AuthRequest, AuthResponse } from '../../../interfaces/auth';


/**
 * @Middleware validate login
 */
 export const validateLogin = async (req : AuthRequest, res : AuthResponse, next: NextFunction) => {
  const { email, password } = req.body
  
  const user = await User.findOne({email});

  if(!user || user.state == false){
    return res.status(401).json({
      msg: `The email or password is incorrect`,
      error: 'Login failed',
    })
  }

  const matchPassword = bcryptjs.compareSync(password, user.password)

  if(!matchPassword) {
    return res.status(401).json({
      msg: `The email or password is incorrect`,
      error: 'Login failed',
    })
  } else {
    //->Se carga el user para no llamar de nuevo a la db - (loginController)
    res.locals.logedUser = user;

    next()
  }
}