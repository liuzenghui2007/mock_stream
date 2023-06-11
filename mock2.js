class StreamMocker {
    constructor() {
      this.listeners = {
        data: [],
        end: [],
      };
      this.intervalId = null;
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
      const sampleRate = 200000; // 采样频率
      const interval = Math.floor(1000 / (sampleRate / channels)); // 每个通道数据的发送间隔
  
      const mockData = new Float32Array(channels);
  
      this.intervalId = setInterval(() => {
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
      }, interval);
    }
  
    stopStreaming() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.listeners.end.forEach(callback => callback()); // 触发 end 事件
      }
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
  
      console.log('收到数据:', channelData);
    }
  });
  
  streamMocker.onEnd(() => {
    console.log('数据流结束');
  });
  
  streamMocker.startStreaming();
  
  // 在适当的时机调用 stopStreaming 来停止数据流
  // streamMocker.stopStreaming();
  