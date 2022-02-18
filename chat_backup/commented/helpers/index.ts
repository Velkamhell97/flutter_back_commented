import jwt from 'jsonwebtoken';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { v4 } from 'uuid';
import path from 'path';

import { JwtPayload } from '../interfaces/jwt_payload';
import { UploadedFile } from 'express-fileupload';
import cloudinary from '../models/cloudinary';


/**
 * @helper generate jwt with uid in payload
 */
export const generateJWT = (uid : string) => {
  return new Promise<string>((resolve, reject) => {
    const payload : JwtPayload = { uid };

    jwt.sign(payload, process.env.SECRETORPRIVATEKEY!, {
      expiresIn: '4h'
    }, (error, token) => {
      if(error){
        reject(error);
      } else {
        resolve(token!);
      }
    })
  })
}

/**
 * @helper verify jwt with jwt token and private key
 */
export const verifyJWT = (token: string) => {
  return new Promise<JwtPayload>((resolve, reject) => {
    jwt.verify(token, process.env.SECRETORPRIVATEKEY!, {}, 
      (error, payload) => {
        if(error) {
          reject(error.message);
        } else {
          resolve(payload as JwtPayload);
        }
    })
  })
}

/**
 * @helper verify google oaut token and return loged user info
 */
export const googleVerify = async (token: string) : Promise<TokenPayload> => {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID, 
  });

  const payload = ticket.getPayload();

  return payload!;
}


/**
 * @helper save file in server memory
 */
export const uploadFile = async(file: {[key:string] : UploadedFile}, folder: any = '') => {
  return new Promise((resolve, reject) => {
    //->Obtenemos la key para devolver el nombre, del objeto como solo vendra de a 1 podemos tomar este
    const key = Object.keys(file)[0];
    const extension = file[key].name.split('.').at(-1);
    const tempName = v4() + '.' + extension;

    //->Por alguna razon en tipescript el dirname apunta a la carpeta controller del dist, por lo que toca salir otr nivel
    const uploadPath = path.join(__dirname, '../../uploads/', folder, '/', tempName);

    //->Aqui utilizamos la funcion de mover que ofrece la libreria, del temp a las uploads, es una promesa
    file[key].mv(uploadPath, function(error:any) {
      if (error) {
        reject ({
          error,
          msg: `File \'${key}\' moved failed`
        });
        // return; //->despues del reject se sigue ejecutando (si no hubiera un else) 
      } else {
        resolve({path: uploadPath, name: tempName, file});
      }
    });
  })
}

/**
 * @helper save file in cloudinary
 */
 export const uploadFileCloudinary = async(file: {[key:string]: UploadedFile}, folder:string) => {
  return new Promise(async (resolve, reject) => {
    //->No se necesita la extension ni el nombre ya que este detecta la extension y le asigna un id
    const key = Object.keys(file)[0];

    try {
      const path = file[key];

      const data = await cloudinary.uploadImage({path: path.tempFilePath, folder});

      resolve({file, data});
    } catch (error) {
      reject ({
        error,
        msg: `File \'${key}\' updload failed`
      })
    }
  });
}