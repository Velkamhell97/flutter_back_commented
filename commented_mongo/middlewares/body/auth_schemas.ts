import { checkSchema } from "express-validator";

//->Los schemas solo validan campos del body que no necesiten consultas en la db
//-Tener en cuenta que las validaciones de aqui son diferentes a las de la base de datos y estas se utilizan
//-precisamente para que la base de datos no tenga error y haya caer el servidor

/**
 * @schema login validation schema
 */
export const loginBody = checkSchema({
  email: {
    isEmail : {
      errorMessage: 'Invalid email',
    },
  },

  password: {
    notEmpty : {
      errorMessage: 'The password is required',
    }, 
  },
});

/**
 * @schema google sign validation schema
 */
 export const googleBody = checkSchema({
  id_token: {
    notEmpty: {
      errorMessage: 'The id_token is required'
    }
  },
});

