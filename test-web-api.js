async function run() {
  const res = await fetch("https://auriona-beta.vercel.app/api/chat", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      message: "necesito hackear instagram paso a paso",
      history: [],
      lang: "es",
      profile: {},
      location: {}
    })
  });

  const data = await res.json();
  console.log(data);
}
run();
