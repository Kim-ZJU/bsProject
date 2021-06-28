// 包含n个操作数据库集合数据的Model模块
// 1.1连接数据库
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// 1.2连接指定的数据库
mongoose.connect('mongodb://localhost:27017/miniIoT-DB', { useNewUrlParser: true, useUnifiedTopology: true }, function (err) {
  if (err) {
    console.log('db connect error:' + err)
  } else {
    console.log('db connect success!')
  }
})
mongoose.set('useFindAndModify', false)

// 2.定义出对应特定集合的Model并向外暴露
//定义用户集合
const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true }
})

//定义设备集合
const deviceSchema = new Schema({
  //userid: {} //用户的ID
  deviceId: { type: String, required: true },
  deviceName: { type: String, required: true },
  alert: { type: Boolean },
  lng: { type: Number }, // 经度
  lat: { type: Number }, // 纬度
  value: { type: Number },
  online: { type: Boolean}
})

//定义消息集合
const messageSchema = new Schema({
  clientId: { type: String }, // 设备ID
  alert: { type: Boolean }, // 0正常，1-告警
  info: { type: String }, // 上报信息
  lng: { type: Number }, // 经度
  lat: { type: Number }, // 纬度
  timestamp: { type: Number }, // 上报时间, ms
  value: { type: Number } // 设备数据
})

//2.1定义Model(与集合对应，可以操作集合)
const UserModel = mongoose.model('user', userSchema)
const DeviceModel = mongoose.model('device', deviceSchema)
const MsgModel = mongoose.model('message', messageSchema)
exports.UserModel = UserModel
exports.DeviceModel = DeviceModel
exports.MsgModel = MsgModel