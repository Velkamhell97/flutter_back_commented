import { Response, NextFunction } from 'express';
import { Op } from 'sequelize';

import { catchError, errorTypes } from '../../errors';
import { CategoriesRequest } from '../../interfaces/categories';
import { Category, User } from '../../models';


/**
 * @middleware validate category id passed by params
 */
 export const validateCategoryID = async (req : CategoriesRequest, res : Response, next: NextFunction) => {
  const { id } = req.params;

  //-Usamos el scope de una manera mas manual
  const dbCategory = await Category.scope('withUser').findByPk(id);

  if(!dbCategory || !dbCategory.state){
    return catchError({type: errorTypes.category_not_found, res});
  } else {
    res.locals.category = dbCategory; //->para controllers que tengan en la ruta el id
  }

  next();
}

/**
 * @middleware validate category name (create and update is valid)
 */
export const validateCategory = async (req : CategoriesRequest, res : Response, next: NextFunction) => {
  const { id } = req.params;
  const { name } = req.body;

  if(!name){
    return next();
  }

  //->Se formatea la informacion, para que haga match con el collate, deberia ser trabajo del front
  const trim = name.split(' ').filter(i => i).join(' ').toLowerCase();

  //-Al parecer sql por defecto tiene activado el collate porque la comparacion es case insensitive
  //-tanto con mayuscular como con acentos
  const dbCategory = await Category.findOne({where: { lower: trim, id : { [Op.ne] : id ?? null } }});

  if(dbCategory){
    return catchError({
      type: errorTypes.duplicate_category,
      extra: `The category with the name: \'${dbCategory.name}\' already exist`,
      res, 
    });
  }

  next();
}


/**
 * @middleware validate the author of category
 */
 export const validateCategoryAuthor = async (_req : CategoriesRequest, res : Response, next: NextFunction) => {
  const category: Category  = res.locals.category;
  const authUser: User = res.locals.authUser;

  if(category.ownerId != authUser.id){
    return catchError({type: errorTypes.category_unauthorized, res});
  }

  next();
}