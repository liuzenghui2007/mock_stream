class StreamDataMocker {
  constructor() {
    this.listeners = {
      data: [],
      end: [],
    };
    this.sendTimerId = null;
    this.sendFrameCount = 0;
    this.startTime = null;
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
      let framesPerSend = Math.floor(sampleRate * (elapsedTime / 1000) - this.totalReceivedFrames)
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
      this.totalReceivedFrames+=framesPerSend;

      console.log(`总发送帧数: ${this.totalReceivedFrames}, 总发送时间: ${elapsedTime / 1000} 秒, 实际发送率: ${actualSampleRate.toFixed(2)} 帧/秒`);
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
const streamDataMocker = new StreamDataMocker();

streamDataMocker.onData(data => {
  console.log('dl', data.length)
  // 解码每一帧数据
  const frameHeader = new Uint8Array([
    0xFF, 0xFF, 0xFF, 0xFF, 0x55, 0x55, 0x55, 0x55, 0xAA, 0xAA, 0xAA, 0xAA
  ]); // 帧头
  const frameFooter = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0xAA, 0xAA, 0xAA, 0xAA, 0x55, 0x55, 0x55, 0x55
  ]); // 帧尾
  const channels = 16; // 通道数量
  const bytesPerChannel = 4; // 每个通道的字节数

  const headerBytes = data.slice(0, frameHeader.length);
  const footerBytes = data.slice(data.length - frameFooter.length);
  const channelBytes = data.slice(frameHeader.length, data.length - frameFooter.length);

  const headerMatch = frameHeader.every((value, index) => value === headerBytes[index]);
  const footerMatch = frameFooter.every((value, index) => value === footerBytes[index]);

  if (headerMatch && footerMatch && channelBytes.length === channels * bytesPerChannel) {
    const channelDataView = new DataView(channelBytes.buffer);
    const channelData = new Float32Array(channels);

    let offset = 0;
    for (let i = 0; i < channels; i++) {
      channelData[i] = channelDataView.getFloat32(offset, true); // 解析二进制数据为 Float32
      offset += bytesPerChannel;
    }

    console.log('收到数据:', channelData);

    // 计算实际采样率
    const currentTime = Date.now();
    const elapsedTime = currentTime - streamDataMocker.startTime;
    const actualSampleRate = streamDataMocker.totalReceivedFrames / (elapsedTime / 1000);

    console.log(`总采样帧数: ${streamDataMocker.totalReceivedFrames}, 总采样时间: ${elapsedTime / 1000} 秒, 实际采样率: ${actualSampleRate.toFixed(2)} 帧/秒`);
  }
});

streamDataMocker.onEnd(() => {
  // 数据流结束时的处理
  console.log('数据流结束');
});

streamDataMocker.startStream(100000, 100); // 采样率为 1000 帧/秒，发送间隔为 100 毫秒

// 模拟运行一段时间后停止数据流
// setTimeout(() => {
//   streamDataMocker.stopStream();
// }, 5000); // 5 秒后停止数据流
