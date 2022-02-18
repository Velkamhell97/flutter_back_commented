import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute, Association, HasManyGetAssociationsMixin, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManySetAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin } from 'sequelize';
import { validate } from 'uuid';
import db from '../database/connection';
import { Category } from './index';

class User extends Model<InferAttributes<User, {omit: 'categories'}>, InferCreationAttributes<User, {omit: 'categories'}>> {
  declare id        : CreationOptional<number>;
  declare name      : string;
  declare lower     : CreationOptional<string>;
  declare email     : string;
  declare password  : string;
  declare avatar    : CreationOptional<string>;
  declare online    : CreationOptional<boolean>;
  declare roleId    : number;
  declare google    : CreationOptional<boolean>;
  // declare state     : CreationOptional<boolean>; //-no necesario con el paranoid
  // declare deletedAt : CreationOptional<date>

  //-en sequilize la populacion de los many es muy flexible permite crear metodos dentro de la misma clase
  //-que no solo regresen los registros relacionados sino que creeen nuevos en la base de datos
  //-relacionados con un usuario en especifico, aunque esto es avanzado sera util para diferentes aplicaciones
  //-aqui solo usaremos el de obtener categorias
  declare getCategories: HasManyGetAssociationsMixin<Category>; // Note the null assertions!
  
  // -agregar
  // declare addCategory: HasManyAddAssociationMixin<Category, number>;
  // declare addCategories: HasManyAddAssociationsMixin<Category, number>;
 
  // // actualizar y remover
  // declare setCategories: HasManySetAssociationsMixin<Category, number>;
  // declare removeCategory: HasManyRemoveAssociationMixin<Category, number>;
  // declare removeCategories: HasManyRemoveAssociationsMixin<Category, number>;
  
  // // -preguntar
  // declare hasCategory: HasManyHasAssociationMixin<Category, number>;
  // declare hasCategories: HasManyHasAssociationsMixin<Category, number>;
  
  // // extras
  // declare countCategories: HasManyCountAssociationsMixin;
  // declare createCategory: HasManyCreateAssociationMixin<Category, "ownerId">;

  //-Esto no estara en la base de datos utilziado para el populate de hasMany
  declare categories ?: NonAttribute<Category[]>;

  //Getter especificos de la tabla, tambien existen los setters
  // get fullName(): NonAttribute<string> {
  //   return this.name;
  // }

  // -Al parecer son metodos de clase que permiten obtener los datos o detalles de las asociaciones
  declare static associations: {
    categories: Association<User, Category>;
  }
}

User.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true,  },
    name: { 
      type: new DataTypes.STRING(50), allowNull: false,
      //-getters se ejecutan siempre que se obtiene este valor en especifcio
      // get() {
      //   const rawValue = this.getDataValue('email');
      //   return rawValue ? rawValue.toUpperCase() : null;
      // }
    },
    lower: new DataTypes.STRING(50),
    email: { type: new DataTypes.STRING(100), allowNull: false, unique: true }, //se puede poner el nombre del unique en vez del true
    password: { 
      type: new DataTypes.STRING(255), allowNull: false,
      //-Hast que se ejecuta siempre que se modifica el parametro
      set(value) {
        // this.setDataValue('password', hash(value));
      },
      //-las validaciones son las que se ejecutan en la parte del typescript antes de pasar a los constrains
      //-de las bases de datos que son los que se definene como propiedad, type, unique, etc
      validate: {
        //aqui se encuentran bastantes validaciones asi como las presentes en express validator
        //-se podria conseiderrar si se quiere manejar toda la logica desde aqui del modelo
        // is: /^[0-9a-f]{64}$/i
        // isEmail: {
        //   msg: 'invalid email'
        // }

        // tambien pueden ser personalizados
        // isEven(value) {
        //   if (parseInt(value) % 2 !== 0) {
        //     throw new Error('Only even values are allowed!');
        //   }
        // }
      }
    },
    //-los virtuals permiten crear propiedades locales que no existen en la base de datos
    // fullName: {
    //   type: DataTypes.VIRTUAL,
    //   get() {
    //     return `${this.firstName} ${this.lastName}`;
    //   },
    //   set(value) {
    //     throw new Error('Do not try to set the `fullName` value!');
    //   }
    // }

    avatar: new DataTypes.STRING(255),
    online: { type: DataTypes.BOOLEAN, defaultValue: false },
    roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    google: { type: DataTypes.BOOLEAN, defaultValue: false },
    // state: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    defaultScope: {
      //-Por si se quiren mostrar las categorias de cada usuario con cada query de find/update (no para create)
      //-por alguna razon no sirve cuando cuando se trata de relaciones hasMany
      // include: { model: Category, as: 'categories', attributes: ["name"] }

      //-Excluye de la salida json
      // attributes: {
      //   // exclude: ["id","roleId"]
      // }
    },
    scopes: {
      deleted: {
        where: db.literal('deletedAt IS NOT NULL')
      }
    },
    tableName: 'users',
    timestamps: true,
    sequelize: db,
    //-Habilita la funcion de soft delete, los elementos borrados tendran una propiedad deleteAt
    //-estos no seran tenidos en cuenta para los query, pero tambien pueden ser restaurados
    paranoid: true,

    //las validaciones anteriores son indivudiales para cada campo aqui podemos hacer una validacion adicional
    //-antes de los constrains en donde tenermos el objeto a guardar
    // validate: {
    //   bothCoordsOrNone() {
    //     if ((this.email === null) !== (this.password === null)) {
    //       throw new Error('Either both email and password, or neither!');
    //     }
    //   }
    // }
  }
);

//Para excluir algunos campos de la salida json se puede usar el attributes con el include o exclude

//-Se ejecuta antes de guardar o actualizar, solo si viene el nombre se actualiza
User.beforeSave(user => {
  if(!user.name) return;

  const trim = user.name.split(' ').filter(i => i).join(' ');

  user.name  = trim.replace(/(^\w|\s\w)(\S*)/g, (_,m1,m2) => m1.toUpperCase()+m2.toLowerCase());
  user.lower = user.name.toLowerCase();
});

//->Las relaciones one-to-one tienen dos tipos belongsTo hasOne, la diferencia principal en ambos es el lugar 
//-donde se asigna la llave foranea, para el belongsTo la llave foranea sera agregado al modelo fuente (User)
//-mientras que para el hasOne la llave foranea se agrega al modelo objetivo (Role)

//-Entonces dependiendo de lo que se quiera y manteniendo un sentido semantico se deben establecer las relaciones
//-correspondientes, tambien depende de la independencia de un modelo con otro por medio de esa llave foranea

//-para el caso del hasOne, lo que traduce esque el modelo usuario tiene un role, que podria ser un projecto o una 
//-direccion, entonces esto lo que hace es crear en la tabla de Role o Project o Adress una columna para 
//-el id del usuario, 

//-Como se puede observar para el objetivo de nosotros no queremos que se cree un userId para cada role, a pesar
//-de que semanticamente suene un poco acertado, ya que cada usuario tiene un role, implicitamente estamos diciendo
//-que un role no puede existir sin un usuario, por  lo que semanticamente estaria mal definida
// User.hasOne(Role, {
  //si no se establece el as, se creara con el nombre de useRoleId, basicamente el as
  //-es lo que antecede al Id 
  // as: 'user',

  //-Estos dos metodos describen como se compotan las tablas cuando se quiera hacer un borrado o update en esta
  //-la tabla target, todas estas opciones son para la targer
  // onDelete:,
  // onUpdate:,

  //si la llave primaria del modelo source es diferente al id, aqui la pasariamos, igual para el caso
  //-en que la priarikey sea diferente en el modelo target, no unicamente puede ser el id, 
  //puede establecerse aqui tambien la columna que quiere usarse como referencia (name, email etc)
  // sourceKey: ''
  // targetKey: ''

  //si se establece este parametro se ignorara la forma terminada el Id y se establecera el nombre pasado
  //recodar que la llave foranea con el hasOne se crea en el target
  // foreignKey: 'user_id' 
// })

//-se podria conseguir el mismo comportamiento con la funcion, aqui las opciones y la llave foranea se crean
//-en la tabla de source que en este caso es el mismo Role, pero se traduciria en algo como mas de Role
//-pertenece a users, lo cual semanticamente esta mal y aclara un poco mas la afirmacion de arriba de que
//-implicitamente estamos diciendo que los Roles no pueden existir sin un usuario
// Role.belongsTo(User, { as: 'user' });

//Ahora bien, conociendo esto, cual seria la relacion correcta que maneje la llave foranea de manera correcta
//-y que semanticamente sea logica seria la siguiente, cuando decimos que el user pertenece a el role
//-creamos la llave foranea en la tabla user, donde es deseado, y ademas indicamos que los roles
//-son un tipo de categoria superiror (usuarios se categorizan por role), y que un role puede existir sin un usuario
//-ahora a pesar de que se crea el indice y la relacion en la tabla de datos, al momento de crear un registro
//-de usuario, sera necesario pasarle el rol al que pertenece y aqui es donde debemos agregar tambien
//-el campo al modelo, que coincida con el autoGenerado, tambien el as sirve como idenficador para metodos populate
//que cuando es un solo id no es muy comun (solo se trae el roleId)
// User.belongsTo(Role, { as: 'role', })

//->Ahora bien tambien podemos utilizar la expresion inversa, pero esta carece de semantica porque, primero indicamos
//-que el role tiene un usuario o varios usuarios, asisgnadoles el roleId a la tabla de usuarios pero se crea
//-una inconsistencia, ya que para el primer caso, un role no tendra solo un usuario puede tener varios
//-y aunque tenga varios usuarios, no necesitamos crear ese tipo de relacion por parte del Role, ya que
//-ningun query a nuestra base de datos trera los usuarios por rol, esta tabla sera de cierto modo independiente
//-y solo se creara para crear unos tipos de rol especificos, que puede escoger cada usuario, en lo sotros
//-modelos veremos como se aplica este tipo de relaciones en ambas direcciones
// Role.hasOne(User, { as: 'role' })
// Role.hasMany(User, { as: 'role })

//-Para el caso de las relacions de uno a muchos, las cosas son muy similares, pero existen otras cosas
//-adicionales para por ejemplo devolver la lista de categorias de un usuario, lo primero es definir la 
//-relacion correcta, en este caso decimos que un usuario tiene varias categorias, como se hacer con el has
//-la llave foranea se crea en el targer es decir en la Category, que es lo esperado, ademas de esto
//-aqui el as y los source funcionan diferente, ya que el source es la columna del source que manejara 
//-la referencia del target en este caso el id es la columna del source y el ownerId es la columna del target
//-que tambien la debemos definir en el modelo de categorias que es el target, ahora bien
//-para obtener las operaciones de get categories y demas metodos virtuales necesitamos determinar el nombre
//-de este populate, en este caso categories
// User.hasMany(Category, {
//   sourceKey: 'id',
//   foreignKey: 'ownerId',
//   as: 'categories',
// });

export default User;