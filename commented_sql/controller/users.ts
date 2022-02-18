import { Response } from 'express';
import bcryptjs from 'bcryptjs';

import { catchError, errorTypes } from '../errors';
import { generateJWT, uploadFileCloudinary } from "../helpers";
import { UsersRequest } from "../interfaces/users";
import { Category, User } from '../models';
import db from '../database/connection';
import { v4 } from 'uuid';
import cloudinary from '../models/cloudinary';
import { Op } from 'sequelize';


/**
 * @controller /api/users/ : GET
 */
export const getUsersController = async (req: UsersRequest, res: Response) => {
  const { limit = 5, from = 0 } = req.query;

  try {

    const users = await User.findAll({
      limit: parseInt(limit.toString()),
      offset: parseInt(from.toString()),
      //-Si queremos obtener los elementos borrardos, como la fila se crea automaticamente,
      //-no podemos sacarla del where, sino con un raw tambien podemos crear un scope para esto
      // where: db.where(db.col("deletedAt"), "!=" ,null),
      //-Si no desactivamos el paranoid para esta query no se nos mostraran los usuarios con safe delete
      // paranoid: false

      // where: db.fn("upppe")
      

      // where: { state: true }, //no necesario con el soft delete
      //-Recordar que las relaciones has many deben configurarse manualmente, por alguna razon
      //-declarar un scope no funciona (noo probado del todo)
      // include: {  model: Category, as: 'categories', attributer: ["name"] }
      //tambien podemos establecer el orden de regreso

      // order: [
        //forma de organizar sin funciones, organizamos por nombre de manera descendiente
        // ['name', 'DESC']

        //-tambien se pueden incluir submodelos
        // [{model: Task, as: 'Task'}, 'createdAt', 'DESC']
        
        //-tenemos tambien como utilidad un conjunto de funciones almacenadas en el db.fn que permite hacer
        //-filtraciones mas especificas, como vemos ordernar registros, puede buscar tambien cuanto el contenidi
        //-de un determinado string tiene una longitud especifia (mirar documentacion)
      //   db.fn('max', db.col('age'))
      // ]

      // order: sequelize.literal('max(age) DESC'), //formal literal
    });

    res.json({msg: 'Users get successfully', users, count: users.length});
  } catch (error) {
    return catchError({error, type: errorTypes.get_users, res});
  }
}


/**
 * @controller /api/users/:id : GET 
 */
 export const getUserByIdController = async (_req: UsersRequest, res: Response) => {
  //-El user no necesita hacer populate de nada (a menos que quiera mostrar las categorias)
  const user: User = res.locals.user;

  res.json({msg: 'Users by ID get successfully', user});
}


/**
 * @controller /api/users/:id/categories : GET
 */
 export const getUserCategoriesController = async (_req: UsersRequest, res: Response) => {
  const user: User = res.locals.user;

  try {
    const categories = await user.getCategories(
      // {where: { state: true }} - innecesario con el soft delete
    );

    res.json({msg: 'User categories get successfully', categories});
  } catch (error) {
    return catchError({error, type: errorTypes.get_user_categories, res});
  }
}


/**
 * @controller /api/users/ : POST
 */
export const createUserController = async (req: UsersRequest, res: Response) => {
  const { role,...userData } = req.body;
  
  const salt = bcryptjs.genSaltSync();
  const hashPassword = bcryptjs.hashSync(userData.password!, salt);
  userData.password = hashPassword;

  const avatar: Express.Multer.File | undefined = res.locals.file;
  
  // if(avatar){
  //   try {
  //     const response = await cloudinary.uploadImage({path: avatar.path, filename: user.id, folder: 'users'});
      
  //     // deleteFilesLocal([avatar.path]) -> Borra archivos (no muy eficiente si estan en temp)
  //     user.avatar = response.secure_url;
  //   } catch (error) { 
  //     return catchError({error, type: errorTypes.upload_cloudinary, res});
  //   }
  // }

  try {
    //-No recomendado
    // const sqlUser2 = new SqlUser({
    //   name: 'TANJIRO',
    //   email: 'daniel2@gmail.com',
    //   password: '123456',
    //   roleId: 1
    // });

    //->A pesar de instanciarla no se crea el id hasta que se grabe
    // const sqlUser3 = SqlUser.build({
    //   name: 'RENGOKU',
    //   email: 'daniel3@gmail.com',
    //   password: '123456',
    //   roleId: 1
    // });
    // sqlUser3.save();

    //-ejemplo de transaccion, utilizamos el id del user para agregar generar el id de la imagen de cloudinary
    //-tambien se puede manejar de manera manual el commit y el rollback, quizas para diferenciar errore
    //-no se sabe si el id de cloudinary sea irrepetible por lo que no se sabe cual sea mas seguro
    //-ya que un mismo usuario no deberia tener el mismo id de imagen
    const result = await db.transaction(async(t) => {
      //-tambien se puden crear varios registros al tiempo con el
      // await User.bulkCreate([
      //   userData,
      //   userData
      // ])

      const user = await User.create(userData, {
        //-No util porque el nuevo usuario no tiene categorias
        // include: { model: Category, as: 'caetgories', attributes: ["name"] }
        //-Para que la transaccion tenga rollback no olvidar este parametro
        transaction: t
      });

      if(avatar){
        //-Podemos crear un id nosotros o dejar que cloudinary genere uno, si cloudinary lo genera
        //-no seria necesario hacer la transaccion ya que podriamos crear el usuario con el avatar fijado
        const ref = v4() + "-" + user.id

        try {
          // const response = await cloudinary.uploadImage({path: avatar.path, filename: ref, folder: 'users'});
          const response = await cloudinary.uploadImage({path: avatar.path, folder: 'users'});
          user.avatar = response.secure_url;
        } catch (error) { 
          throw {error, type: errorTypes.upload_cloudinary, res};
        }
      }

      await user.save({transaction: t});
    
      return user;
    });

    //-Si todo sale bien retorna el elemento retornado dentro de la funcion
    generateJWT(result.id.toString()).then((token) => {
      return res.json({msg: 'User saved successfully', result, token});
    }).catch((error) => {
      throw {error, type: errorTypes.generate_jwt};
      // return catchError({error, type: errorTypes.generate_jwt, res});
    })
  } catch (error) {
    return catchError({error, type: errorTypes.save_user, res});
  }
}

/**
 * @controller /api/users/:id : PUT
 */
export const updateUserController = async (req: UsersRequest, res: Response) => {
  const { id } = req.params;
  const { role, ...userData } = req.body;
  
  //-Asi la interfaz diga que el userData no puede ser undefined, si en el body no esta lo dara como undefined
  if(userData.password){
    const salt = bcryptjs.genSaltSync();
    const hashPassword = bcryptjs.hashSync(userData.password, salt);
    userData.password = hashPassword;
  }

  const avatar: Express.Multer.File | undefined = res.locals.file; 

  
  //cr3979trq48p4amif3fq
  try {
    //->se debe encontrar y luego actualizar o se podria usar el where del update
    const user = await User.findByPk(id);

    if(avatar){
      try {
        const response = await cloudinary.uploadImage({path: avatar.path, filename: user!.avatar, folder: 'users'});
        userData.avatar = response.secure_url;
      } catch (error) { 
        return catchError({error, type: errorTypes.upload_cloudinary, res});
      }
    }

    //-se puede setear el include si se quieren ver las categorias en el objeto devuelto
    //-en este punto ya se asegura que existe el usuario
    await user!.update(userData);

    //tambien podriamos usar una transaccion para evaluar que no falle en ninguno de los dos query 
    //(auqque el find no afecta niguna fila)

    return res.json({msg: 'User update successfully', user});
  } catch (error) {
    return catchError({error, type: errorTypes.update_user, res});
  }
}


/**
 * @controller /api/users/:id : DELETE
 */
export const deleteUserController = async (req: UsersRequest, res: Response) => {
  const { id } = req.params;
  const user = res.locals.user; //-para mostrar el usuario borrado

  try {
    //-Sin el soft delete, podriamos obtener el id para mostrar el usuario borrado
    // const user = await User.findByPk(id);
    // await user!.update({state: false});

    //-Con soft delete, no hace un borrado fisico sino virtual, agrega el deleteAt, no devuelve el documento
    //-actualizado, solo el numero de filas afectadas
    await User.destroy({where: {id}})

    return res.json({msg: 'User delete successfully', user});
  } catch (error) {
    return catchError({error, type: errorTypes.delete_user, res});
  }
}

