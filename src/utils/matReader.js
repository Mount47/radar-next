// 这里我们模拟从 .mat 文件读取数据
// 实际项目中，您需要将 .mat 文件转换为 JSON 格式
// 可以使用 Python 脚本预处理 .mat 文件，将其转换为 JSON

import { gunzip } from 'fflate'

export function readMatFile(arrayBuffer) {
  return new Promise((resolve, reject) => {
    try {
      // 将 ArrayBuffer 转换为 DataView 以便读取二进制数据
      const view = new DataView(arrayBuffer)

      // 读取文件头部（前 124 字节是 MAT 文件头）
      const header = new TextDecoder().decode(new Uint8Array(arrayBuffer.slice(0, 124)))
      console.log('MAT file header:', header)

      // 跳过头部，开始读取数据
      let offset = 124 // 头部长度

      // 读取数据元素
      const data = []

      // 调试信息：打印文件的总字节数
      console.log('Total file size:', arrayBuffer.byteLength, 'bytes')

      while (offset < arrayBuffer.byteLength) {
        // 读取数据类型和大小
        const dataType = view.getInt32(offset, false)
        const numBytes = view.getInt32(offset + 4, false)

        console.log('At offset', offset, ':', {
          dataType,
          numBytes,
          remainingBytes: arrayBuffer.byteLength - offset
        })

        // 检查数据类型
        switch (dataType) {
          case 1: console.log('Found miINT8'); break
          case 2: console.log('Found miUINT8'); break
          case 3: console.log('Found miINT16'); break
          case 4: console.log('Found miUINT16'); break
          case 5: console.log('Found miINT32'); break
          case 6: console.log('Found miUINT32'); break
          case 7: console.log('Found miSINGLE'); break
          case 9: console.log('Found miDOUBLE'); break
          case 12: console.log('Found miINT64'); break
          case 13: console.log('Found miUINT64'); break
          case 14: console.log('Found miMATRIX'); break
          default: console.log('Unknown data type:', dataType)
        }

        if (dataType === 14) { // miMATRIX
          // 矩阵数据，需要进一步解析
          offset += 8 // 跳过类型和大小字段

          // 读取数组标志和维度
          const arrayFlags = view.getInt32(offset, false)
          const dimensions = view.getInt32(offset + 4, false)
          console.log('Matrix data:', { arrayFlags, dimensions })

          // 继续解析矩阵数据...
          offset += numBytes
        } else if (dataType > 0 && dataType <= 13 && numBytes > 0 && numBytes < arrayBuffer.byteLength) {
          // 其他数值类型
          offset += 8 // 跳过类型和大小字段

          // 读取数据
          if (dataType === 7) { // miSINGLE
            const numElements = numBytes / 4
            for (let i = 0; i < numElements; i++) {
              data.push(view.getFloat32(offset + i * 4, false))
            }
          } else if (dataType === 9) { // miDOUBLE
            const numElements = numBytes / 8
            for (let i = 0; i < numElements; i++) {
              data.push(view.getFloat64(offset + i * 8, false))
            }
          }

          offset += numBytes
        } else {
          // 无效的数据类型或大小，可能是文件格式不正确
          console.error('Invalid data type or size:', { dataType, numBytes })
          break
        }
      }

      console.log('Parsed data length:', data.length)
      console.log('Parsed data:', data)
      resolve(data)
    } catch (error) {
      console.error('Error reading MAT file:', error)
      reject(new Error('无法解析 MAT 文件格式：' + error.message))
    }
  })
}

export const loadECGData = async(filename) => {
  try {
    // 这里假设您已经将 .mat 文件转换为 JSON 并存放在 public/data 目录下
    const response = await fetch(`/data/${filename}.json`)
    if (!response.ok) {
      throw new Error('Failed to load ECG data')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error loading ECG data:', error)
    return null
  }
}
