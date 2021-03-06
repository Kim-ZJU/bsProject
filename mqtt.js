const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://localhost:11883"); // 指定服务端地址和端口
const db = require("./db/models");

client.on("connect", function() {
    client.subscribe("testapp", { qos: 1 }); // 订阅主题为testapp的消息
    client.subscribe("$SYS/brokers/+/clients/+/connected");  // 订阅设备上线主题
    client.subscribe("$SYS/brokers/+/clients/+/disconnected");  // 订阅设备下线主题
    console.log("@EMQX 服务器连接成功");
});

client.on("message", async function (top, message) {
    // 用正则表达式替换将主题前缀
    const reg = /\$SYS\/brokers\/emqx@127\.0\.0\.1\/clients\//
    const realTopic = top.replace(reg,'')
    // 如果是设备上报信息
    if (realTopic === "testapp") {
        // 保存上报信息
        const msg = JSON.parse(message.toString())
        const doc = db.MsgModel(msg).save();
        if (!doc) {
            console.log("@EMQX 设备订阅信息存储失败")
            console.log(doc);
        }
        // 根据上报信息更新设备属性
        let arr = Object.values(msg)
        const updateDevice = await db.DeviceModel.update({deviceId: arr[1]},
            {
                alert: arr[0],
                lat: arr[3],
                lng: arr[4],
                value: arr[6]
            })
        if (!updateDevice) {
            console.log("根据上报信息修改设备信息失败！")
        }
    // 如果是设备上线主题
    } else if (realTopic[11] === 'c') {
        // 如果上线设备之前不在数据库中，则创建设备
        console.log(realTopic.substring(0, 10))
        const device = await db.DeviceModel.findOne({deviceId: realTopic.substring(0, 10)})
        let tmpValue = Math.floor(Math.random() * 100)
        if (!device) {
            const newDevice = await db.DeviceModel({
                deviceId: realTopic.substring(0, 10),
                deviceName: realTopic.substring(0, 10),
                value: tmpValue,
                alert: tmpValue > 80 ? 1 : 0,
                lat: 30.1 + Math.random() * 0.4,
                lng: 119.9 +  Math.random() * 0.6,
                online: true
            }).save()
            if (!newDevice) {
                console.log("根据上线信息创建设备失败！")
            }
        } else {
            // 如果设备已经在数据库中，则更新设备为在线状态
            const updateDevice = await db.DeviceModel.update({deviceId: realTopic.substring(0, 10)}, {online:true})
            if (!updateDevice) {
                console.log("根据上线信息修改设备信息失败！")
            }
        }
    // 如果是设备下线主题
    } else {
        // 更新设备为下线状态
        console.log(realTopic.substring(0, 10))
        const updateDevice = await db.DeviceModel.update({deviceId: realTopic.substring(0, 10)}, {online:false})
        if (!updateDevice) {
            console.log("根据上线信息修改设备信息失败！")
        }
    }
});

module.exports = client;