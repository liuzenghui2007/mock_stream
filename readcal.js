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

let sampleCount = 0;
let previousTimestamp = Date.now();

port.on('data', (data) => {
  // 更新接收到的数据缓冲区
  buffer = Buffer.concat([buffer, data]);

  while (buffer.length >= frameSize) {
    // 提取帧数据并解析
    const frameData = buffer.slice(0, frameSize);
    const frame = parseFrame(frameData);

    if (frame) {
      // 将提取的数据添加到数组
      receivedData.push(frame.fdata);
    }

    buffer = buffer.slice(frameSize);
  }
});

setInterval(() => {
  // 统计采样率
  const currentTimestamp = Date.now();
  const timeDiff = currentTimestamp - previousTimestamp;

  // 计算采样率（每秒多少采样）
  const sampleRate = (receivedData.length - sampleCount) / (timeDiff / 1000);

  // 打印采样率
  console.log(`Sample Rate: ${sampleRate.toFixed(2)} Hz`);

  // 更新时间戳和采样计数
  previousTimestamp = currentTimestamp;
  sampleCount = receivedData.length;
}, 1000);

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
