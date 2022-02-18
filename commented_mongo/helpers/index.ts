import jwt from 'jsonwebtoken';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { v4 } from 'uuid';
import path from 'path';

import { CloudinaryUploadedFile, CustomUploadedFile, LocalUploadedFile } from '../interfaces/uploads';
import { JwtPayload } from '../interfaces/jwt_payload';
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
        return reject(error);
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
          return reject(error.message);
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


//->Uncamente requerido para la librerria file-update
/**
 * @helper save file in server memory
 */
export const uploadFileLocal = async(file: CustomUploadedFile, folder?: string) : Promise<LocalUploadedFile> => {
  return new Promise<LocalUploadedFile>((resolve, reject) => {
    //->Al tenerl el customFileLocal tenemos acceso al fieldname
    const extension = file.name.split('.').at(-1);
    const tempName = v4() + '.' + extension;

    //->Si no viele el folfer se guarda en la raiz con el nombre temp, si lo trae se guarda en ese folder
    const chunk = folder ? ("/" + folder) : "";
    //->Por alguna razon en tipescript el dirname apunta a la carpeta controller del dist, por lo que toca salir otr nivel
    //->Recordar que la coma crea un /
    const uploadPath = path.join(__dirname, `../../uploads${chunk}`, tempName);

    file.mv(uploadPath, function(error:any) {
      if (error) {
        return reject({
          error,
          msg: `File \'${file.fieldname}\' failed to move too local path`
        });
        // return; //->despues del reject se sigue ejecutando (si no hubiera un else) 
      } else {
        resolve({fieldname: file.fieldname, path: uploadPath, name: tempName});
      }
    });
  });
}

//->manejo del error de files de multer
export const onUploadError = (res: Response, next: NextFunction) => (error:any) => {
  if(error){
    return catchError({error, type: errorTypes.upload_local_files, res});
  }

  next();
}

export const deleteFilesLocal = async(paths: string[]) => {
  for(let path of paths){
    if(fs.existsSync(path)){
      fs.unlinkSync(path);
    }
  }
}

/**
 * @helper save file in cloudinary
 */
 export const uploadFileCloudinary = async(fieldname:string, path: string, folder ?: string) : Promise<CloudinaryUploadedFile> => {
  return new Promise<CloudinaryUploadedFile>(async (resolve, reject) => {
    try {
      const data = await cloudinary.uploadImage({path, folder});
      resolve({fieldname, url: data.secure_url, name: data.public_id});
    } catch (error) {
      return reject ({
        error,
        msg: `File \'${fieldname}\' failed to upload to cloudinary`
      });
    }
  });
}