var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var formidable = require('formidable'); //上传功能的插件
var mongoose = require('mongoose')
const md5 = require('blueimp-md5'); //md加密的函数
const db = require("../db/models");
const filter = { password: 0, __v: 0 } //查询过滤出指定的属性
const { UserModel, DeviceModel } = require('../db/models')

router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});
// 注册的路由
router.post('/register', async function (req, res) {
  // 读取请求参数数据
  const {username, password, email} = req.body
  // 处理: 判断用户是否已经存在, 如果存在, 返回提示错误的信息, 如果不存在, 保存
  // 查询(根据username/email)
  const user = await db.UserModel.find({
        $or: [
          {username: username},
          {email: email}
        ]
  });
  // 如果user有值(已存在)
  if (user.length > 0) {
    // 返回提示错误的信息
    res.send({code: 1, msg: '此用户已存在'})
  } else if (username.length <= 6 || password.length <= 6) { //如果用户名和密码长度不符合要求
    res.send({code: 1, msg:'用户名和密码必须在6字节以上！'})
  } else if(!email.match(/^\w+@\w+\.\w+$/i)) { //如果邮箱格式不对
    res.send({code: 1, msg: '邮箱格式不正确！'})
  } else {
    // 保存
    new UserModel({
      username,
      password: md5(password),
      email
    }).save(function (error, user) {
      // 返回响应数据
      req.session.userid = user._id
      res.send({code: 0, msg: "恭喜你,注册成功！"})
    })
  }
})

//检测登录状态
router.get('/isLogin', function (req, res) {
  const userid = req.session.userid
  if (!userid) {
    return res.send({ code: 1, msg: '亲爱的游客,请您先登陆' })
  }
  // 查询
  UserModel.findOne({ _id: userid }, filter, function (err, user) {
    // 如果没有, 返回错误提示
    if (!user) {
      // 清除浏览器保存的userid
      delete req.session.userid
      res.send({ code: 1, msg: '亲爱的游客,请您先登陆' })
    } else {
      // 如果有, 返回user
      res.send({ code: 0, msg: "已登录", data: user })
    }
  })
})

//登录的路由  
router.post('/login', function (req, res) {
  const { username, password } = req.body
  UserModel.findOne({ username, password: md5(password) }, filter, function (err, user) {
    if (user) { //登录成功
      req.session.userid = user._id
      res.send({ code: 0, msg: "恭喜你,登录成功!" })
    } else {  //登录失败
      res.send({ code: 1, msg: '用户名或密码不正确' })
    }
  })
})

//创建设备
router.post('/createDevice', function (req, res) {
  const {deviceId, deviceName} = req.body
  let tmpValue = Math.floor(Math.random() * 100)
  DeviceModel.findOne({ deviceId, deviceName }, function (err, device) {
    if (device) {
      return res.send({code: 1, msg: "设备已存在！"})
    } else {
      new DeviceModel({
        deviceId: deviceId,
        deviceName: deviceName,
        value: tmpValue,
        alert: tmpValue > 80 ? 1 : 0,
        lng: 119.9 +  Math.random() * 0.6,
        lat: 30.1 + Math.random() * 0.4,
        online: false
      }).save(function (error, device1) {
        console.log(device1)
        return res.send({code: 0, msg: "设备创建成功！"})
      })
    }
  })
})

//修改设备信息
router.post('/modifyDevice', function (req, res) {
  const {deviceId, deviceAttr, attrValue} = req.body;
  DeviceModel.findOne({deviceId}, function (err, device) {
    if (err) {
      return res.send({code: 1, msg: "设备不存在！"})
    } else {
      if (deviceAttr === 'deviceId') {
        DeviceModel.findOneAndUpdate({deviceId}, {deviceId: attrValue}, function (error, device) {
          console.log(device)
          return res.send({code: 0, msg: '设备ID修改成功！'})
        })
      } else if (deviceAttr === 'deviceName') {
        DeviceModel.findOneAndUpdate({deviceId}, {deviceName: attrValue}, function (error, device) {
          console.log(device)
          return res.send({code: 0, msg: '设备名称修改成功！'})
        })
      } else if (deviceAttr === 'value') {
        DeviceModel.findOneAndUpdate({deviceId}, {value: attrValue, alert: attrValue > 80 ? 1 : 0}, function (error, device) {
          console.log(device)
          return res.send({code: 0, msg: '设备数据修改成功！'})
        })
      } else if (deviceAttr === 'online') {
        DeviceModel.findOneAndUpdate({deviceId}, {online: attrValue}, function (error, device) {
          console.log(device)
          return res.send({code: 0, msg: '设备状态修改成功！'})
        })
      }
    }
  })
})

//获取设备列表
router.get('/deviceList', async function (req,res) {
  const devices = await db.DeviceModel.find({}).sort({'deviceId':1})
  if (!devices.length) {
    return res.send({code: 1, msg: '目前没有设备！'})
  } else {
    return res.send({code: 0, content: devices})
  }
})

//获取单个设备上报信息
router.post('/getDeviceMsg', async function (req, res) {
  const {deviceId} = req.body
  const messages = await db.MsgModel.find({clientId: deviceId}).sort({'timestamp':1})
  if (!messages.length) {
    return res.send({code: 1, msg: '该设备暂时没有信息上报'})
  } else {
    return res.send({code: 0, content: messages})
  }
})

//获取接受的数据量
router.get('/getMessageNumber', async function (req,res) {
  const messages = await db.MsgModel.find({})
  let messageNum = 0
  if (!messages.length) {
    return res.send({code: 1, msg: '暂未接收到数据！'})
  } else {
    messageNum = messages.length
    return res.send({code: 0, content: messageNum})
  }
})

//获取所有接受的数据
router.get('/getMessages', async function (req,res) {
  const messages = await db.MsgModel.find({})
  if (!messages.length) {
    return res.send({code: 1, msg: '暂未接收到数据！'})
  } else {
    return res.send({code: 0, content: messages})
  }
})

//退出登录
router.get('/loginout', function (req, res) {
  // 清除浏览器保存的userid的cookie
  delete req.session.userid
  // 返回数据
  res.send({ code: 0, msg: '您已经成功退出登录!' })
})

module.exports = router;
