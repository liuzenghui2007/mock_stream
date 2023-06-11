class StreamMocker {
  constructor(sampleRate) {
    this.listeners = {
      data: [],
      end: [],
    };
    this.sendTimerId = null;
    this.receiveTimerId = null;
    this.sendFrameCount = 0;
    this.receiveFrameCount = 0;
    this.startTime = null;
    this.sampleRate = sampleRate;
  }

  onData(callback) {
    this.listeners.data.push(callback);
  }

  onEnd(callback) {
    this.listeners.end.push(callback);
  }

  startStreaming() {
    const channels = 16; // 通道数量
    const bytesPerChannel = 4; // 每个通道的字节数
    const frameHeader = new Uint8Array([
      0xFF, 0xFF, 0xFF, 0xFF, 0x55, 0x55, 0x55, 0x55, 0xAA, 0xAA, 0xAA, 0xAA
    ]); // 帧头
    const frameFooter = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0xAA, 0xAA, 0xAA, 0xAA, 0x55, 0x55, 0x55, 0x55
    ]); // 帧尾
    const interval = 1000 / this.sampleRate; // 固定发送和接收的间隔（单位：毫秒）

    const mockData = new Float32Array(channels);

    this.startTime = Date.now();

    const sendFrame = () => {
      // 生成模拟数据
      for (let i = 0; i < channels; i++) {
        mockData[i] = Math.random(); // 随机生成一个 Float32 数据
      }

      const frameData = new Uint8Array(
        frameHeader.length + channels * bytesPerChannel + frameFooter.length
      );
      let offset = 0;

      // 填充帧头
      frameData.set(frameHeader, offset);
      offset += frameHeader.length;

      // 填充通道数据
      const channelBytes = new Uint8Array(bytesPerChannel);
      const channelDataView = new DataView(channelBytes.buffer);
      for (let i = 0; i < channels; i++) {
        channelDataView.setFloat32(0, mockData[i], true); // 将 Float32 数据转换为二进制
        frameData.set(channelBytes, offset);
        offset += bytesPerChannel;
      }

      // 填充帧尾
      frameData.set(frameFooter, offset);

      this.listeners.data.forEach(callback => callback(frameData)); // 触发 data 事件
      this.sendFrameCount++;

      const currentTime = Date.now();
      const elapsedTime = currentTime - this.startTime;
      const expectedSendFrameCount = Math.floor(elapsedTime / interval);
      if (this.sendFrameCount < expectedSendFrameCount) {
        const missedFrames = expectedSendFrameCount - this.sendFrameCount;
        for (let i = 0; i < missedFrames; i++) {
          this.listeners.data.forEach(callback => callback(frameData)); // 补发漏掉的帧数据
          this.sendFrameCount++;
        }
      }

      this.sendTimerId = setTimeout(sendFrame, interval);
    };

    const receiveInfo = () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - this.startTime;
      const actualSendSampleRate = this.sendFrameCount / (elapsedTime / 1000);
      const actualReceiveSampleRate = this.receiveFrameCount / (elapsedTime / 1000);
      console.log(`发送采样帧数: ${this.sendFrameCount}, 发送时间: ${elapsedTime / 1000} seconds, 实际发送采样率: ${actualSendSampleRate.toFixed(2)} frames/second`);
      console.log(`接收采样帧数: ${this.receiveFrameCount}, 接收时间: ${elapsedTime / 1000} seconds, 实际接收采样率: ${actualReceiveSampleRate.toFixed(2)} frames/second`);

      this.receiveTimerId = setTimeout(receiveInfo, interval);
    };

    this.sendTimerId = setTimeout(sendFrame, interval);
    this.receiveTimerId = setTimeout(receiveInfo, interval);
  }

  stopStreaming() {
    if (this.sendTimerId) {
      clearTimeout(this.sendTimerId);
      this.sendTimerId = null;
    }
    if (this.receiveTimerId) {
      clearTimeout(this.receiveTimerId);
      this.receiveTimerId = null;
    }
    this.listeners.end.forEach(callback => callback()); // 触发 end 事件
  }
}

// 使用示例
const streamMocker = new StreamMocker(100000); // 设置目标采样率为100 frames/second

streamMocker.onData(data => {
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

    // 打印接收的数据
    // console.log('收到数据:', channelData);
    streamMocker.receiveFrameCount++;
  }
});

streamMocker.onEnd(() => {
  console.log('数据流结束');
});

streamMocker.startStreaming();

// 在适当的时机调用 stopStreaming 来停止数据流
// streamMocker.stopStreaming();
