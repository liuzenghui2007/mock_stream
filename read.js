const SerialPort = require('serialport');

const port = new SerialPort('/dev/ttyUSB0', {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
});

const CH_COUNT = 3;
const frameSize = 4 + CH_COUNT * 4; // 每帧的大小

let receivedData = []; // 存储提取的数据

let buffer = Buffer.alloc(0);

port.on('data', (data) => {
  buffer = Buffer.concat([buffer, data]); // 将接收到的数据添加到缓冲区

  // 提取每一帧数据
  while (buffer.length >= frameSize) {
    const frameData = buffer.slice(0, frameSize); // 从缓冲区中提取一帧数据

    // 解析帧数据
    const frame = parseFrame(frameData);
    if (frame) {
      // 将提取的数据添加到数组
      receivedData.push(frame.fdata);
      console.log(frame.fdata)
    }

    buffer = buffer.slice(frameSize); // 从缓冲区中删除已处理的数据
  }
});

function parseFrame(frameData) {
  if (frameData.length !== frameSize) {
    console.error('Invalid frame data');
    return null;
  }

  const frame = {
    fdata: [],
    tail: [],
  };

  // 解析通道数据
  for (let i = 0; i < CH_COUNT; i++) {
    const offset = 4 + i * 4;
    const fValue = frameData.readFloatLE(offset);
    frame.fdata.push(fValue);
  }

  // 解析帧尾
  frame.tail = frameData.slice(frameSize - 4, frameSize);

  return frame;
}

// 在需要时打印接收到的数据
// setInterval(() => {
//   console.log('Received Data:', receivedData);
// }, 1000);
