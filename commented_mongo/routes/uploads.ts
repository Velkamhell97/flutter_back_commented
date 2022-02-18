/**
 * @path /api/uploads
 */
 import { NextFunction, Request, Response, Router } from "express";
import multer, { diskStorage } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 } from 'uuid';

//-Routes Middlewares
import { 
  getProductImgMiddlewares, 
  getUserAvatarMiddlewares,
  uploadFilesMiddlewares, 
} from "../middlewares/uploads";

//-Routes Controllers
import { 
  getProductImgController, 
  getUserAvatarController, 
  uploadFilesCloudinaryController, 

} from "../controller/uploads";

// import { onUploadError } from "../helpers";

//Para cuando se desea guaradr los archivos de multer localmente, asignamos la salida y el nomber
//-luego si no pasa alguna validacion se borra, pero si las pasa solo muestra los resultados
//y no los borra
const storage = diskStorage({
  destination: function(_req, _res, cb) {
    const uploadPath = path.join(__dirname, `../../uploads/others`);
    
    if(!fs.existsSync(uploadPath)){
      fs.mkdirSync(uploadPath);
    }
    
    cb(null, uploadPath);
  },
  filename: function(_req, file, cb){
    const extension = file.originalname.split('.').at(-1);
    const tempName = v4() + "." + extension;

    cb(null, tempName);
  }
});

const upload = multer({storage: storage});

//cuando se trabaja temporal, en el de clour tambien funcionaria en otro directorio porque se borran 
//con cada upload exitoso
// const upload = multer({dest: '/tmp/'});

const router = Router();

//-para este caso del file upload, se hacen las validaciones correspondientes en el temp
//-y si hay un error se borran de estos paths, si pasan se mueven del path a los nuevos directorios
//-el directorio se establece en el controlador (este podria recibir una propiedad como folder)
router.post('/local',
  uploadFilesMiddlewares,
  uploadFilesLocalController,
)

//Para el caso de multer es diferente no hay funcion de mover, apenas los archivos pasan la validacion
//-se quedan en ese folder, por esa razon se debe configurar el folder de salida y el nombre de los archivos
//aqui
router.post('/multer',
  //->manejador de errores de multer, similar a la funcion de filter que tiene, mejor se implemento
  //->el middleware propio
  // (_req: Request, res: Response, next: NextFunction) => upload(_req, res, onUploadError(res, next)),
  upload.any(),
  uploadFilesMiddlewares,
  uploadFilesLocalMulterController,
)

//en esta ruta los archivos de ambas librerias se almacenen en temp y se borran con un error o cuando son subidos
router.post('/cloud',
  //->para subir multiples archivos a cloudinary con multer, almacenando estos en tmp, con cualquier libreria
  //-se puede manejar otro destino que temp porque de todos modos se borran despues de subidos
  upload.any(), 
  uploadFilesMiddlewares,
  uploadFilesCloudinaryController
)

router.get('/users/:id',
  getUserAvatarMiddlewares,
  getUserAvatarController
)

router.get('/products/:id',
  getProductImgMiddlewares,
  getProductImgController,
)

export default router;