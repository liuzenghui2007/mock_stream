class StreamMocker {
    constructor() {
      this.listeners = {
        data: [],
        end: [],
      };
      this.intervalId = null;
      this.frameCount = 0;
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
      const sampleRate = 200000; // 采样频率
      const interval = 1000; // 输出间隔，单位为毫秒
  
      const mockData = new Float32Array(channels);
  
      this.startTime = Date.now();
  
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
  
        this.frameCount++;
        this.listeners.data.forEach(callback => callback(frameData)); // 触发 data 事件
  
        if (this.frameCount % (sampleRate / channels) === 0) {
          const currentTime = Date.now();
          const elapsedTime = currentTime - this.startTime;
          const actualSampleRate = Math.floor(this.frameCount / (elapsedTime / 1000));
          console.log(`采样帧数: ${this.frameCount}, 采样时间: ${elapsedTime}ms, 实际采样率: ${actualSampleRate} frames/second`);
        }
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
    // 解码逻辑省略，根据需要自行添加
  });
  
  streamMocker.onEnd(() => {
    console.log('数据流结束');
  });
  
  streamMocker.startStreaming();
  
  // 在适当的时机调用 stopStreaming 来停止数据流
  // streamMocker.stopStreaming();
  