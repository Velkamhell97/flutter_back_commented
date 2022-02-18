import { model, Schema, Types } from "mongoose";

export interface User {
  name      : string,
  lower     : string,
  email     : string,
  password  : string,
  avatar   ?: string,
  online    : boolean,
  role      : Types.ObjectId,
  google    : boolean,
  state     : boolean,
}

const userSchema = new Schema<User>({
  name     : { type: String, required: [true, 'The name is required'] },
  lower    : String,
  email    : { type: String, required: [true, 'The email is required'], unique: true },
  password : { type: String, required: [true, 'The password is required'] },
  avatar   : String,
  online   : { type: Boolean, default: false },
  role     : { type: Schema.Types.ObjectId, ref: 'Role', required: [true, 'The role is required'] },
  google   : { type: Boolean, default: false },
  state    : { type: Boolean, default: true },
}, 
  { 
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    //->Las fechas por lo general se formatean en el lado del cliente
    timestamps: { createdAt: 'created', updatedAt: 'updated' } 
  }
)


//-El metodo pre y post se utilizan para ejecutar ciertas operaciones en los elementos del modelo
//-antes o despues de una accion en especifica, muy util para sanitizar o aplicar transformaciones a los modelos
//-antes que estos sean almacenados, la ventaja de esto frente a los setters y getters o virtual methods, esque
//-se definen una unica vez y no se tendran que volver a ejecutar con cada query, claro esta que esto depende
//-de las especificaciones del proyecto
userSchema.pre('save', function(this: User, next) {
  const trim = this.name.split(' ').filter(i => i).join(' ');

  this.name  = trim.replace(/(^\w|\s\w)(\S*)/g, (_,m1,m2) => m1.toUpperCase()+m2.toLowerCase());
  this.lower = this.name.toLowerCase();

  next();
})

userSchema.pre('findOneAndUpdate', function(next) {
  let update = {...this.getUpdate()} as { name:string, lower:string };

  if(!update.name){
    next();
  }

  const trim = update.name.split(' ').filter(i => i).join(' ');

  update.name  = trim.replace(/(^\w|\s\w)(\S*)/g, (_,m1,m2) => m1.toUpperCase()+m2.toLowerCase());
  update.lower = update.name.toLowerCase();

  this.setUpdate(update);

  next();
})

//-Un virtual es un metodo virtual que tenemos disponible unicamente en el objeto devuelvto por un query
//-no esta en la base de datos como una propiedad, solo un metodo helper de algun modelo
//-generalmente son setters, pero tambien pueden configurarse como setters, para modificar elementos
//-del modelo, aqui es un ejemplo imaginario si se quisiera devolver el nombre completo solo visualmente
//-tambien se podria establecer ese valor y separarlo e asignarlo a cada propiedad
userSchema.virtual('fullName').
  get(function(this:User) {
    return this.name + ' ' + this.email;
    }).
  set(function(this: User , v : string) {
    this.name  = v.substring(0, v.indexOf(' '));
    this.email = v.substring(v.indexOf(' ') + 1);
});


userSchema.methods.toJSON = function() {
  const { __v, _id, id, password, ...user  } = this.toObject();
  user.uid = _id;
  return user;
}

userSchema.virtual('categories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'user'
})

const userModel = model<User>('User', userSchema);

//Se pueden programar eventos para cambios en la data que deberia hacerlo los sockets
// userModel.watch().on('change', data => {});

export default userModel;
