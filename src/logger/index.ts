import { inspect } from 'util'

export default function(serviceName: string) {
  return {
    info: function(data: any) {
      console.log(this.format(data))
    },
    error: function(data: any) {
      console.error(this.format(data))
    },
    format: function(data: any, noTime = false) {
      return (noTime ? '' : `${new Date().toLocaleString()}::`) + `${serviceName}::${data.map(d => typeof d === 'object' ? inspect(d) : d ? d.toString() : d).join(', ')}`
    },
  }
}
