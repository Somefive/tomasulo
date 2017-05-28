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
		LSP: 1,
		memorySetter: {
			addr: 0,
			value: 0
		},
		AddCalculating: false,
		MultCalculating: false
	},
	methods: {
		/**
		 * @return {string}
		 */
		QVDisplay: function(Q, V) {
			if (Q === 0) return V;
			else return '#'+Q;
		},
		/**
		 * @return {string}
		 */
		TimeDisplay: function(t) {
			if (t == -1) return 'idle';
			else if (t == -2) return 'waiting';
			else return t;
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
var LoadStoreSeqSize = 0;
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
		id: ++RefCount,
		time: -1,
		A: 0,
		Seq: -1
	});
	vue.StoreBuf.push({
		id: ++RefCount,
		time: -1,
		A: 0,
		Q: 0,
		V: 0,
		Seq: -1
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
function loadMemory(addr) {
	if (vue.Memory.hasOwnProperty(addr)) return vue.Memory[addr];
	else return 0;
}
function runOneStep() {
	++vue.timestamp;
	if (vue.InP < vue.Ops.length) {
		var instruction = vue.Ops[vue.InP];
		var op = instruction.op.toUpperCase();
		var A = parseInt(instruction.A.substr(1));
		var B = parseInt(instruction.B.substr(1));
		var C = parseInt(instruction.C.substr(1));
		var i, j;
		if (op == 'ADD' || op == 'SUB') {
			for (i=0;i<3;++i) if (vue.AddRS[i].time == -1) break;
			if (i == 3) return;
			vue.AddRS[i].time = -2;
			vue.AddRS[i].op = op;
			vue.AddRS[i].Qj = vue.FPRegisters[A].Q;
			vue.AddRS[i].Vj = vue.FPRegisters[A].V;
			vue.AddRS[i].Qk = vue.FPRegisters[B].Q;
			vue.AddRS[i].Vk = vue.FPRegisters[B].V;
			vue.FPRegisters[C].Q = vue.AddRS[i].id;
			++vue.InP;
		} else if (op == 'MUL' || op == 'DIV') {
			for (i=0;i<2;++i) if (vue.MultRS[i].time == -1) break;
			if (i == 2) return;
			vue.MultRS[i].time = -2;
			vue.MultRS[i].op = op;
			vue.MultRS[i].Qj = vue.FPRegisters[A].Q;
			vue.MultRS[i].Vj = vue.FPRegisters[A].V;
			vue.MultRS[i].Qk = vue.FPRegisters[B].Q;
			vue.MultRS[i].Vk = vue.FPRegisters[B].V;
			vue.FPRegisters[C].Q = vue.MultRS[i].id;
			++vue.InP;
		} else if (op == 'STORE') {
			for (i=0;i<3;++i) if (vue.StoreBuf[i].time == -1) break;
			if (i == 3) return;
			vue.StoreBuf[i].time  = -2;
			vue.StoreBuf[i].A = parseInt(instruction.B);
			vue.StoreBuf[i].Seq = ++LoadStoreSeqSize;
			vue.StoreBuf[i].Q = vue.FPRegisters[A].Q;
			vue.StoreBuf[i].V = vue.FPRegisters[A].V;
			++vue.InP;
		} else if (op == 'LOAD') {
			for (i=0;i<3;++i) if (vue.LoadBuf[i].time == -1) break;
			if (i == 3) return;
			vue.LoadBuf[i].time  = -2;
			vue.LoadBuf[i].A = parseInt(instruction.B);
			vue.LoadBuf[i].Seq = ++LoadStoreSeqSize;
			vue.FPRegisters[A].Q = vue.LoadBuf[i].id;
			++vue.InP;
		}
	}
	var id, value;
	var notify_list = [];
	// ADD/SUB
	for (i=0;i<3;++i) if (vue.AddRS[i].time > 0) break;
	if (i == 3) {
		for (j=0;j<3;++j) {
			if (vue.AddRS[j].time == -2
				&& vue.AddRS[j].Qj == 0
				&& vue.AddRS[j].Qk == 0) {
				vue.AddRS[j].time = 1;
				break;
			}
		}
	} else {
		--vue.AddRS[i].time;
		if (vue.AddRS[i].time == 0) {
			id = vue.AddRS[i].id;
			value = 0;
			if (vue.AddRS[i].op == 'ADD') value = vue.AddRS[i].Vj + vue.AddRS[i].Vk;
			else if (vue.AddRS[i].op == 'SUB') value = vue.AddRS[i].Vj - vue.AddRS[i].Vk;
			notify_list.push({id:id, value:value});
			vue.AddRS[i].time = -1;
			vue.AddRS[i].op = '';
			vue.AddRS[i].Qj = 0;
			vue.AddRS[i].Qk = 0;
			vue.AddRS[i].Vj = 0;
			vue.AddRS[i].Vk = 0;
		}
	}
	//MUL/DIV
	for (i=0;i<2;++i) if (vue.MultRS[i].time > 0) break;
	if (i == 2) {
		for (j=0;j<2;++j) {
			if (vue.MultRS[j].time == -2
				&& vue.MultRS[j].Qj == 0
				&& vue.MultRS[j].Qk == 0) {
				if (vue.MultRS[j].op == 'MUL') vue.MultRS[j].time = 9;
				else if (vue.MultRS[j].op == 'DIV') vue.MultRS[j].time = 39;
				break;
			}
		}
	} else {
		--vue.MultRS[i].time;
		if (vue.MultRS[i].time == 0) {
			id = vue.MultRS[i].id;
			value = 0;
			if (vue.MultRS[i].op == 'MUL') value = vue.AddRS[i].Vj * vue.AddRS[i].Vk;
			else if (vue.MultRS[i].op == 'DIV') value = vue.AddRS[i].Vj / vue.AddRS[i].Vk;
			notify_list.push({id:id, value:value});
			vue.MultRS[i].time = -1;
			vue.MultRS[i].op = '';
			vue.MultRS[i].Qj = 0;
			vue.MultRS[i].Qk = 0;
			vue.MultRS[i].Vj = 0;
			vue.MultRS[i].Vk = 0;
		}
	}
	//STORE
	for (i=0;i<3;++i) if (vue.StoreBuf[i].time > 0) break;
	if (i == 3) {
		for (j=0;j<3;++j) {
			if (vue.StoreBuf[j].time == -2
			&& vue.StoreBuf[j].Q == 0 && vue.LSP == vue.StoreBuf[j].Seq) {
				vue.StoreBuf[j].time = 1;
				break;
			}
		}
	} else {
		--vue.StoreBuf[i].time;
		if (vue.StoreBuf[i].time == 0) {
			++vue.LSP;
			storeMemory(vue.StoreBuf[i].A, vue.StoreBuf[i].V);
			vue.StoreBuf[i].time = -1;
			vue.StoreBuf[i].A = 0;
			vue.StoreBuf[i].Q = 0;
			vue.StoreBuf[i].V = 0;
			vue.StoreBuf[i].Seq = -1;
		}
	}
	//LOAD
	for (i=0;i<3;++i) if (vue.LoadBuf[i].time > 0) break;
	if (i == 3) {
		for (j=0;j<3;++j) {
			if (vue.LoadBuf[j].time == -2 && vue.LSP == vue.LoadBuf[j].Seq) {
				vue.LoadBuf[j].time = 1;
				break;
			}
		}
	} else {
		--vue.LoadBuf[i].time;
		if (vue.LoadBuf[i].time == 0) {
			++vue.LSP;
			id = vue.LoadBuf[i].id;
			value = loadMemory(vue.LoadBuf[i].A);
			notify_list.push({id:id, value:value});
			vue.LoadBuf[i].time = -1;
			vue.LoadBuf[i].A = 0;
			vue.LoadBuf[i].Seq = -1;
		}
	}
	//Notify
	for (var k in notify_list) {
		ReadyAndNotify(notify_list[k].id, notify_list[k].value);
	}
}

function runNStep(n) {
	for (var step=0;step<n;++step)
		runOneStep();
}

function ReadyAndNotify(id, value) {
	console.log("Notify:"+id+","+value);
	var i,j;
	for (i=0;i<3;++i) {
		if (vue.AddRS[i].Qj == id) {
			vue.AddRS[i].Qj = 0;
			vue.AddRS[i].Vj = value;
		}
		if (vue.AddRS[i].Qk == id) {
			vue.AddRS[i].Qk = 0;
			vue.AddRS[i].Vk = value;
		}
		if (vue.StoreBuf[i].Q == id) {
			vue.StoreBuf[i].Q = 0;
			vue.StoreBuf[i].V = value;
		}
	}
	for (i=0;i<2;++i) {
		if (vue.MultRS[i].Qj == id) {
			vue.MultRS[i].Qj = 0;
			vue.MultRS[i].Vj = value;
		}
		if (vue.MultRS[i].Qk == id) {
			vue.MultRS[i].Qk = 0;
			vue.MultRS[i].Vk = value;
		}
	}
	for (j=0;j<=10;++j) if (vue.FPRegisters[j].Q == id) break;
	if (j<=10) {
		vue.FPRegisters[j].Q = 0;
		vue.FPRegisters[j].V = value;
	}
}