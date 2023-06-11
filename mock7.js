class StreamDataMocker {
  constructor() {
    this.listeners = {
      data: [],
      end: [],
    };
    this.sendTimerId = null;
    this.sendFrameCount = 0;
    this.startTime = null;
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

    const framesPerSend = sampleRate * (sendInterval / 1000); // 每次发送的数据帧数

    const sendFrames = () => {
      for (let i = 0; i < framesPerSend; i++) {
        // 生成模拟数据
        const mockData = new Uint8Array(
          frameHeader.length + channels * bytesPerChannel + frameFooter.length
        );
        let offset = 0;

        // 填充帧头
        mockData.set(frameHeader, offset);
        offset += frameHeader.length;

        // 填充通道数据
        const channelBytes = new Uint8Array(bytesPerChannel);
        const channelDataView = new DataView(channelBytes.buffer);
        for (let j = 0; j < channels; j++) {
          const channelData = new Float32Array(1);
          channelData[0] = Math.random(); // 随机生成一个 Float32 数据
          channelDataView.setFloat32(0, channelData[0], true); // 将 Float32 数据转换为二进制
          mockData.set(channelBytes, offset);
          offset += bytesPerChannel;
        }

        // 填充帧尾
        mockData.set(frameFooter, offset);

        this.listeners.data.forEach(callback => callback(mockData)); // 触发 data 事件
        this.sendFrameCount++;
      }

      const currentTime = Date.now();
      const elapsedTime = currentTime - this.startTime;
      const actualSampleRate = this.sendFrameCount / (elapsedTime / 1000);

      console.log(`总采样帧数: ${this.sendFrameCount}, 总采样时间: ${elapsedTime / 1000} 秒, 实际采样率: ${actualSampleRate.toFixed(2)} 帧/秒`);
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
  // 处理收到的数据
  // console.log('收到数据:', data);
});

streamDataMocker.onEnd(() => {
  // 数据流结束时的处理
  console.log('数据流结束');
});

streamDataMocker.startStream(100, 200); // 采样率为 1000 帧/秒，发送间隔为 100 毫秒

// 模拟运行一段时间后停止数据流
// setTimeout(() => {
//   streamDataMocker.stopStream();
// }, 5000); // 5 秒后停止数据流
