/**
 * @path /api/users
 */
import { Router } from "express";
import multer from 'multer';


//-Routes Middlewares
import { 
  createUserMiddlewares, 
  deleteUserMiddlewares, 
  getUserByIdMiddlewares, 
  getUserCategoriesMiddlewares, 
  updateUserMiddlewares 
} from "../middlewares";

//-Routes Controllers
import { 
  createUserController,
  updateUserController,
  deleteUserController,
  getUserByIdController,
  getUserCategoriesController,
  getUsersController
} from "../controller/users";


const router = Router();
//->La diferencia principal entre el fileupload y el multer para estos casos de archivos unicos es que
//->el file upload, es un middleware glocal, mientras que el multer mas te ruta, en donde se debe definir la
//->ruta de salida o el path en cada ruta, que para estos casos de subir archivos a cloudinary se puede dejar
//->el temp, el file upload se configura por defecto, estos archivos no se mueven
const upload = multer({dest: '/tmp/'})

router.get('/', getUsersController);

router.get('/:id',
  getUserByIdMiddlewares,
  getUserByIdController 
);

router.get('/:id/categories',
  getUserCategoriesMiddlewares,
  getUserCategoriesController
);

router.post('/', 
  //->en multer debemos enviar el tipo de archivo que vamos a recibir en el file-upload no
  //->igualmente en multer se tendria que capturar el error en caso que al poner un solo archivo
  //->se vayan a subir 2 o se suba 1 con el fieldname diferente al pasaro eso se validaria 
  //->en la funcion on error 
  upload.any(),
  //onError
  createUserMiddlewares,
  // createUserController,
  createUserWithTransactionController
);

router.put('/:id', 
  upload.any(),
  updateUserMiddlewares,
  // updateUserController,
  updateUserWithTransactionController
); 

router.delete('/:id', 
  deleteUserMiddlewares,
  deleteUserController
); 

export default router;