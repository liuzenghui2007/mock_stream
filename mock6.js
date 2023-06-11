class StreamMocker {
    constructor() {
      this.listeners = {
        data: [],
        end: [],
      };
      this.frameCount = 0;
      this.startTime = null;
      this.sendInterval = 100; // 发送间隔，单位为毫秒
      this.sampleRate = 20000; // 采样频率
      this.framesPerInterval = Math.floor((this.sampleRate / 1000) * this.sendInterval); // 每个间隔发送的帧数
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
  
      const mockData = new Float32Array(channels);
  
      this.startTime = Date.now();
      let frameIndex = 0;
  
      const sendFrames = () => {
        for (let i = 0; i < this.framesPerInterval; i++) {
          frameIndex++;
          // 生成模拟数据
          for (let j = 0; j < channels; j++) {
            mockData[j] = Math.random(); // 随机生成一个 Float32 数据
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
          for (let j = 0; j < channels; j++) {
            channelDataView.setFloat32(0, mockData[j], true); // 将 Float32 数据转换为二进制
            frameData.set(channelBytes, offset);
            offset += bytesPerChannel;
          }
  
          // 填充帧尾
          frameData.set(frameFooter, offset);
  
          this.listeners.data.forEach(callback => callback(frameData)); // 触发 data 事件
        }
  
        if (frameIndex % (this.sampleRate / 1000) === 0) {
          const currentTime = Date.now();
          const elapsedTime = currentTime - this.startTime;
          const actualSampleRate = Math.floor(frameIndex / (elapsedTime / 1000));
          console.log(`发送采样帧数: ${frameIndex}, 发送时间: ${elapsedTime / 1000} seconds, 实际发送采样率: ${actualSampleRate.toFixed(2)} frames/second`);
        }
  
        setTimeout(sendFrames, this.sendInterval);
      };
  
      sendFrames();
    }
  }
  
  const streamMocker = new StreamMocker();
  
  // 注册数据接收事件的回调函数
  streamMocker.onData(frameData => {
    // 处理接收到的帧数据
  });
  
  streamMocker.startStreaming();
  