class StreamMocker {
    constructor() {
      this.listeners = {
        data: [],
        end: [],
      };
      this.sendIntervalId = null;
      this.receiveIntervalId = null;
      this.sendFrameCount = 0;
      this.receiveFrameCount = 0;
      this.startTime = null;
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
      const sampleRate = 1000000; // 采样频率
      const sendInterval = Math.floor(1000 / sampleRate); // 发送间隔
      const receiveInterval = 1000; // 接收间隔
  
      const mockData = new Float32Array(channels);
  
      this.startTime = Date.now();
      this.sendIntervalId = setInterval(() => {
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
      }, sendInterval);
  
      this.receiveIntervalId = setInterval(() => {
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.startTime;
        const actualSendSampleRate = this.sendFrameCount / (elapsedTime / 1000);
        const actualReceiveSampleRate = this.receiveFrameCount / (elapsedTime / 1000);
        console.log(`发送采样帧数: ${this.sendFrameCount}, 发送时间: ${elapsedTime / 1000} seconds, 实际发送采样率: ${actualSendSampleRate.toFixed(2)} frames/second`);
        console.log(`接收采样帧数: ${this.receiveFrameCount}, 接收时间: ${elapsedTime / 1000} seconds, 实际接收采样率: ${actualReceiveSampleRate.toFixed(2)} frames/second`);
      }, receiveInterval);
    }
  
    stopStreaming() {
      if (this.sendIntervalId) {
        clearInterval(this.sendIntervalId);
        this.sendIntervalId = null;
      }
      if (this.receiveIntervalId) {
        clearInterval(this.receiveIntervalId);
        this.receiveIntervalId = null;
      }
      this.listeners.end.forEach(callback => callback()); // 触发 end 事件
    }
  }
  
  // 使用示例
  const streamMocker = new StreamMocker();
  
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
    //   console.log('收到数据:', channelData);
      streamMocker.receiveFrameCount++;
    }
  });
  
  streamMocker.onEnd(() => {
    console.log('数据流结束');
  });
  
  streamMocker.startStreaming();
  
  // 在适当的时机调用 stopStreaming 来停止数据流
  // streamMocker.stopStreaming();
  