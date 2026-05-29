import {
  Shield,
  Satellite,
  Brain,
  Lock
} from "lucide-react"

function SystemStatus() {

const items=[

{
title:"AI Threat Detection",
status:"ACTIVE",
icon:<Brain/>,
color:"text-emerald-400"
},

{
title:"Satellite Feed",
status:"CONNECTED",
icon:<Satellite/>,
color:"text-blue-400"
},

{
title:"Encryption",
status:"SECURED",
icon:<Lock/>,
color:"text-purple-400"
},

{
title:"System Health",
status:"98%",
icon:<Shield/>,
color:"text-yellow-400"
}

]

return(

<div className="grid md:grid-cols-4 gap-5 mt-6">

{items.map((item,index)=>(

<div
key={index}
className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
>

<div className={`${item.color} mb-3`}>
{item.icon}
</div>

<p className="text-slate-400 text-sm">
{item.title}
</p>

<h3 className="font-bold mt-2">
{item.status}
</h3>

</div>

))}

</div>

)

}

export default SystemStatus