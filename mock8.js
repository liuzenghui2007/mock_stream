class StreamDataMocker {
  constructor() {
    this.listeners = {
      data: [],
      end: [],
    };
    this.sendTimerId = null;
    this.sendFrameCount = 0;
    this.startTime = null;
    this.totalSentFrames = 0;
    this.totalReceivedFrames = 0; // 添加变量来统计总帧数
  }

  onData(callback) {
    this.listeners.data.push(callback);
  }

  onEnd(callback) {
    this.listeners.end.push(callback);
  }

  startStream(sampleRate, sendInterval) {
    const channels = 16; // 通道数量
    const bytesPerChannel = 4; // 每个通道的字节数
    const frameHeader = new Uint8Array([
      0xFF, 0xFF, 0xFF, 0xFF, 0x55, 0x55, 0x55, 0x55, 0xAA, 0xAA, 0xAA, 0xAA
    ]); // 帧头
    const frameFooter = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0xAA, 0xAA, 0xAA, 0xAA, 0x55, 0x55, 0x55, 0x55
    ]); // 帧尾




    const sendFrames = () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - this.startTime;
      let framesPerSend = Math.floor(sampleRate * (elapsedTime / 1000) - this.totalSentFrames)
      let accumulatedData = new Uint8Array(
        framesPerSend * (frameHeader.length + channels * bytesPerChannel + frameFooter.length)
      ); // 累积的数据
      let offset = 0;
      for (let i = 0; i < framesPerSend; i++) {
        // 填充帧头
        accumulatedData.set(frameHeader, offset);
        offset += frameHeader.length;

        // 填充通道数据和帧尾
        for (let j = 0; j < channels; j++) {
          const channelBytes = new Uint8Array(bytesPerChannel);
          const channelDataView = new DataView(channelBytes.buffer);
          const channelData = new Float32Array(1);
          channelData[0] = Math.random(); // 随机生成一个 Float32 数据
          channelDataView.setFloat32(0, channelData[0], true); // 将 Float32 数据转换为二进制
          accumulatedData.set(channelBytes, offset);
          offset += bytesPerChannel;
        }
        
        accumulatedData.set(frameFooter, offset);
        offset += frameFooter.length;
      }

      this.listeners.data.forEach(callback => callback(accumulatedData)); // 触发 data 事件
      this.sendFrameCount += framesPerSend;


      const actualSampleRate = this.sendFrameCount / (elapsedTime / 1000);

      // 统计总帧数
      this.totalSentFrames+=framesPerSend;

      console.log(`总发送帧数: ${this.totalSentFrames}, 总发送时间: ${elapsedTime / 1000} 秒, 实际发送率: ${actualSampleRate.toFixed(2)} 帧/秒`);
    };

    this.startTime = Date.now();
    this.sendTimerId = setInterval(sendFrames, sendInterval);
  }

  stopStream() {
    clearInterval(this.sendTimerId);
    this.sendTimerId = null;
    this.sendFrameCount = 0;
    this.startTime = null;

    this.listeners.end.forEach(callback => callback()); // 触发 end 事件
  }
}

// 示例用法
function findUint8ArrayPosition(source, target, offset = 0) {
  if (!(source instanceof Uint8Array) || !(target instanceof Uint8Array)) {
    throw new Error('Both arguments must be Uint8Array.');
  }

  if (offset < 0 || offset > source.length) {
    console.log('offff', offset, source.length)
    throw new Error('Invalid offset.');
  }

  const maxIndex = source.length - target.length;
  for (let i = offset; i <= maxIndex; i++) {
    let found = true;
    for (let j = 0; j < target.length; j++) {
      if (source[i + j] !== target[j]) {
        found = false;
        break;
      }
    }

    if (found) {
      return i;
    }
  }

  return -1; // If target is not found in source
}



const streamDataMocker = new StreamDataMocker();

streamDataMocker.onData(data => {
  // console.log('Received data:', data.length);

  const frameHeader = new Uint8Array([
    0xFF, 0xFF, 0xFF, 0xFF, 0x55, 0x55, 0x55, 0x55, 0xAA, 0xAA, 0xAA, 0xAA
  ]); // 帧头
  const frameFooter = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0xAA, 0xAA, 0xAA, 0xAA, 0x55, 0x55, 0x55, 0x55
  ]); // 帧尾
  const channels = 16; // 通道数量
  const bytesPerChannel = 4; // 每个通道的字节数

  const frames = [];
  let offset = 0;
  let headerIndex = findUint8ArrayPosition(data, frameHeader, offset);

  while (headerIndex !== -1 && headerIndex < data.length) {
    // 查找帧尾的索引
    const footerIndex = findUint8ArrayPosition(data, frameFooter, headerIndex + frameHeader.length);
    // console.log('headerIndex',headerIndex, 'footter', footerIndex)
    if (footerIndex === -1) {
      console.log('Invalid data: Frame footer not found');
      break;
    }

    // 提取通道数据
    const frameData = data.slice(headerIndex + frameHeader.length, footerIndex);
    // console.log('frameData length', frameData.length)
    const expectedDataLength = channels * bytesPerChannel;
    
    if (frameData.length === expectedDataLength) {
      const channelData = new Float32Array(channels);
      const channelDataView = new DataView(frameData.buffer);

      for (let i = 0; i < channels; i++) {
        const channelOffset = i * bytesPerChannel;
        channelData[i] = channelDataView.getFloat32(channelOffset, true);
      }

      frames.push(channelData);
    } else {
      console.log(`Invalid data: Invalid frame length. Expected length: ${expectedDataLength}, Actual length: ${frameData.length}`);
    }

    offset = footerIndex + frameFooter.length;
    // console.log('oo',offset)
    headerIndex = findUint8ArrayPosition(data, frameHeader, offset);
  }

  // 打印解析的数据
  console.log('Received frames:', frames.length);
  streamDataMocker.totalReceivedFrames += frames.length
  console.log(`总接收帧数: ${streamDataMocker.totalReceivedFrames},`);
});



streamDataMocker.onEnd(() => {
  // 数据流结束时的处理
  console.log('数据流结束');
});

streamDataMocker.startStream(200, 1000); // 采样率为 1000 帧/秒，发送间隔为 100 毫秒

// 模拟运行一段时间后停止数据流
// setTimeout(() => {
//   streamDataMocker.stopStream();
// }, 5000); // 5 秒后停止数据流
