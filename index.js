var vue = new Vue({
	el: '#app',
	data: {
		timestamp: 0,
		message:"hello",
		FPRegisters: [],
		LoadBuf: [],
		StoreBuf: [],
		AddRS: [],
		MultRS: [],
		Ops: [],
		RunningOps: [],
		Memory: {},
		MemoryIndex: [],
		InP: 0,
		RunP: 0,
		memorySetter: {
			addr: 0,
			value: 0
		}
	},
	methods: {
		/**
		 * @return {string}
		 */
		QVDisplay: function(Q, V) {
			if (Q === 0) return V;
			else return '#'+Q;
		}
	}
});
var i;
for(i=0;i<=10;++i) {
	vue.FPRegisters.push({
		id:i,
		Q:0,
		V:0
	});
}
var RefCount = 0;
for(i=0;i<3;++i) {
	vue.AddRS.push({
		id: ++RefCount,
		time: -1,
		op: '',
		Qj: 0,
		Qk: 0,
		Vj: 0,
		Vk: 0
	});
	vue.LoadBuf.push({
		id: i+1,
		busy: 0,
		A: 0,
		Cache: 0
	});
	vue.StoreBuf.push({
		id: i+1,
		busy: 0,
		A: 0,
		Q: 0
	});
}
for(i=0;i<2;++i) {
	vue.MultRS.push({
		id: ++RefCount,
		time: -1,
		op: '',
		Qj: 0,
		Qk: 0,
		Vj: 0,
		Vk: 0
	});
}
function clearArray(arr) {
	while (arr.length > 0)
		arr.pop();
}
function removeArray(arr, item) {
	var buflst = [];
	var i = null;
	while (arr.length > 0) {
		i = arr.pop();
		if (i != item) buflst.push(i);
		else break;
	}
	while (buflst.length > 0) {
		i = buflst.pop();
		arr.push(i);
	}
}
function addArray(arr, item) {
	item = parseInt(item);
	for(var i in arr) {
		if(arr[i]==item) return;
	}
	arr.push(item);
}
function loadFile(files) {
	if (files.length <= 0) return;
	clearArray(vue.Ops);
	clearArray(vue.RunningOps);
	vue.InP = 0;
	vue.RunP = 0;
	var reader = new FileReader();
	reader.onload = function() {
		var lines = this.result.split('\n');
		console.log(lines);
		for(var i in lines) {
			var data = lines[i].toUpperCase().split(' ');
			if (data.length < 4) continue;
			vue.Ops.push({
				id: vue.Ops.length,
				op: data[0],
				A: data[1],
				B: data[2],
				C: data[3]
			});
		}
	};
	reader.readAsText(files[0]);
}
function storeMemory(addr, value) {
	removeArray(vue.MemoryIndex, addr);
	if (value != 0) addArray(vue.MemoryIndex, addr);
	vue.Memory[addr] = value;
	if (value === 0)
		delete vue.Memory[addr];
}