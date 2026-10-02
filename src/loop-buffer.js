// Prepare once after decoding. Looping then runs entirely on the audio thread.
export function seamlessLoop(ctx, buffer, overlapSeconds = .4) {
  const count=buffer.numberOfChannels, length=buffer.length, rate=buffer.sampleRate;
  const channels=Array.from({length:count},(_,i)=>buffer.getChannelData(i));
  // Only strip codec silence at the edges, never quiet passages inside a recording.
  const silent=(i)=>channels.every(data=>Math.abs(data[i])<.00001);
  const limit=Math.min(Math.floor(rate*.15),Math.floor(length/8));
  let start=0,end=length;
  while(start<limit && silent(start)) start++;
  while(end>length-limit && silent(end-1)) end--;
  const overlap=Math.min(Math.round(rate*overlapSeconds),Math.floor((end-start)/4));
  if(overlap<2) return buffer;
  const output=ctx.createBuffer(count,end-start-overlap,rate);
  const middle=end-start-2*overlap;
  for(let c=0;c<count;c++) {
    const source=channels[c], target=output.getChannelData(c);
    target.set(source.subarray(start+overlap,end-overlap));
    for(let i=0;i<overlap;i++) {
      const head=i/(overlap-1);
      // Complementary weights retain headroom even for correlated recordings.
      target[middle+i]=source[end-overlap+i]*(1-head)+source[start+i]*head;
    }
  }
  return output;
}
