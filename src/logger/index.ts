import { inspect } from 'util'

export default function(serviceName: string) {
  return {
    info: function(data: any) {
      console.log(`${new Date().toLocaleString()}::${serviceName}::${data.map(d => typeof d === 'object' ? inspect(d) : d).join(', ')}`)
    },
    error: function(data: any) {
      console.error(`${new Date().toLocaleString()}::${serviceName}::${data.map(d => typeof d === 'object' ? inspect(d) : d).join(', ')}`)
    }
  }
}
