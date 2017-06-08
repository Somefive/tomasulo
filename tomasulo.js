class MemorySetter {
	constructor() {
		this.address = 0;
		this.value = 0;
	}
}

function OpBuilder(line) {
	var arr = line.toUpperCase().replace(/,/g,' ').split(/\s+/);
	if(arr.length == 3) {
		arr[3] = '0';
	}
	if(arr.length != 4) return null;
	for(var i=1;i<=3;++i) {
		if (arr[i][0] == 'F') arr[i] = arr[i].substr(1);
		arr[i] = parseInt(arr[i]);
	}
	return new Operation(arr[0], arr[1], arr[2], arr[3]);
}
class Operation {
	init() {
		this.operator = '';
		this.operandA = 0;
		this.operandB = 0;
		this.operandC = 0;
		this.issue = 0;
		this.execute = 0;
		this.writeResult = 0;
		this.id = Operation.Size++;
	}
	constructor(op, A, B, C) {
		this.init();
		this.operator = op;
		this.operandA = A;
		this.operandB = B;
		this.operandC = C;
	}
	displayOperand(operand) {
		if (operand == 'A') return 'F'+this.operandA;
		else if (operand == 'B') {
			if (this.operator != 'LD' && this.operator != 'ST') return 'F'+this.operandB;
			else return this.operandB;
		}
		else {
			if (this.operator != 'LD' && this.operator != 'ST') return 'F'+this.operandC;
			else return '';
		}
	}
}
Operation.Size = 0;

class QV {
	constructor(q, v) {
		this.set(q,v);
	}
	display() {
		if (this.Q == 0) return this.V;
		else return '#'+this.Q;
	}
	setQV(qv) {
		this.Q = qv.Q;
		this.V = qv.V;
	}
	set(q,v) {
		this.Q = q;
		this.V = v;
	}
	update(index, value) {
		if (this.Q == index) {
			this.Q = 0;
			this.V = value;
		}
	}
}

class Register {
	constructor() {
		this.id = Register.Size++;
		this.QV = new QV(0,0);
	}
}
Register.Size = 0;

class ReservationStation {
	constructor(name) {
		this.id = ++ReservationStation.Size;
		this.time = 0;
		this.state = 'IDLE';
		this.name = name;
		this.operation = null;
	}
	clear() {
		this.time = 0;
		this.state = 'IDLE';
		this.operation = null;
	}
	displayTime() {
		if (this.state != 'RUNNING') return '--';
		else return this.time;
	}
	displayOper() {
		if (this.operation == null) return '--';
		else return this.operation.operator;
	}
	isReady() {
		return this.state == 'WAITING';
	}
	run() {
		this.state = 'RUNNING';
		--this.time;
	}
}
ReservationStation.Size = 0;
class ALUReservationStation extends ReservationStation {
	constructor(name) {
		super(name);
		this.j = new QV(0,0);
		this.k = new QV(0,0);
	}
	isReady() {
		return super.isReady() && this.j.Q == 0 && this.k.Q == 0;
	}
}
class MemoryBuffer extends ReservationStation {
	constructor(name) {
		super(name);
		this.A = 0;
		this.Seq = 0;
	}
	displaySeq() {
		if (this.state == 'IDLE') return '--';
		else return this.Seq;
	}
	displayQV() { return '--'; }
	isReady() {
		return super.isReady() && this.Seq == vue.RunningMemory;
	}
}
MemoryBuffer.Seq = 0;
class LoadBuffer extends MemoryBuffer {
	constructor(name) {
		super(name);
	}
}
class StoreBuffer extends MemoryBuffer {
	constructor(name) {
		super(name);
		this.QV = new QV(0,0);
	}
	displayQV() { return this.QV.display(); }
	isReady() {
		return super.isReady() && this.QV.Q == 0;
	}
}

var vue = new Vue({
	el: '#app',
	data: {
		timestamp: 0,
		memorySetter: new MemorySetter(),
		Memory: {},
		MemoryIndex: [],
		InP: 0,
		Ops:[],
		Registers:[],
		RS: [],
		Buffer: [],
		RunningAdd: -1,
		RunningMul: -1,
		RunningMemory: 1
	},
	methods: {
	}
});

function init() {
	var i;
	for (i=0;i<=10;++i) vue.Registers.push(new Register());
	for (i=1;i<=3;++i) vue.RS.push(new ALUReservationStation('Add'+i));
	for (i=1;i<=2;++i) vue.RS.push(new ALUReservationStation('Mul'+i));
	for (i=1;i<=3;++i) vue.Buffer.push(new LoadBuffer('Load'+i));
	for (i=1;i<=3;++i) vue.Buffer.push(new StoreBuffer('Store'+i));
}
init();

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
	vue.InP = 0;
	var reader = new FileReader();
	reader.onload = function() {
		var lines = this.result.split('\n');
		for(var i in lines) {
			console.log(lines[i]);
			var op = OpBuilder(lines[i]);
			if (op != null)
				vue.Ops.push(op);
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
	issue();
	execute();
}

function issue() {
	if (vue.InP >= vue.Ops.length) return;
	var inst = vue.Ops[vue.InP];
	var i,j;
	if (inst.operator == 'ADDD' || inst.operator == 'SUBD') {
		for (i=0;i<3;++i) if (vue.RS[i].state == 'IDLE') break;
		if (i == 3) return;
		vue.RS[i].state = 'ISSUED';
		vue.RS[i].operation = inst;
		vue.RS[i].j.setQV(vue.Registers[inst.operandB].QV);
		vue.RS[i].k.setQV(vue.Registers[inst.operandC].QV);
		vue.RS[i].time = 2;
		vue.Registers[inst.operandA].QV.set(vue.RS[i].id, 0);
	} else if (inst.operator == 'MULD' || inst.operator == 'DIVD') {
		for (i=3;i<5;++i) if (vue.RS[i].state == 'IDLE') break;
		if (i == 5) return;
		vue.RS[i].state = 'ISSUED';
		vue.RS[i].operation = inst;
		vue.RS[i].j.setQV(vue.Registers[inst.operandB].QV);
		vue.RS[i].k.setQV(vue.Registers[inst.operandC].QV);
		vue.RS[i].time = (inst.operator == 'MULD')?10:40;
		vue.Registers[inst.operandA].QV.set(vue.RS[i].id, 0);
	} else if (inst.operator == 'LD') {
		for (i=0;i<3;++i) if (vue.Buffer[i].state == 'IDLE') break;
		if (i == 3) return;
		vue.Buffer[i].operation = inst;
		vue.Buffer[i].state = 'ISSUED';
		vue.Buffer[i].Seq = ++MemoryBuffer.Seq;
		vue.Buffer[i].A = inst.operandB;
		vue.Buffer[i].time = 2;
		vue.Registers[inst.operandA].QV.set(vue.Buffer[i].id, 0);
	} else if (inst.operator == 'ST') {
		for (i=3;i<6;++i) if (vue.Buffer[i].state == 'IDLE') break;
		if (i == 6) return;
		vue.Buffer[i].operation = inst;
		vue.Buffer[i].state = 'ISSUED';
		vue.Buffer[i].Seq = ++MemoryBuffer.Seq;
		vue.Buffer[i].A = inst.operandB;
		vue.Buffer[i].time = 2;
		vue.Buffer[i].QV.setQV(vue.Registers[inst.operandA].QV);
	} else {
		return;
	}
	++vue.InP;
	inst.issue = vue.timestamp;
}

function execute() {
	var id, value;
	var i, j;
	var notify = {};
	//ADD
	for (i=0;i<3;++i) if (vue.RS[i].state == 'WRITING') vue.RS[i].clear();
	for (i=0;i<3;++i) if (vue.RS[i].state == 'RUNNING') break;
	if (i == 3) {
		for (j=0;j<3;++j) {
			if (vue.RS[j].isReady()) {
				vue.RS[j].run();
				vue.RunningAdd = j;
				vue.RS[j].operation.execute = vue.timestamp;
				break;
			}
		}
	} else {
		vue.RS[i].run();
		if (vue.RS[i].time == 0) {
			vue.RS[i].state = 'WRITING';
			vue.RS[i].operation.writeResult = vue.timestamp+1;
			notify[vue.RS[i].id] = (vue.RS[i].operation.operator == 'ADDD')
				? (vue.RS[i].j.V + vue.RS[i].k.V)
				: (vue.RS[i].j.V - vue.RS[i].k.V);
		}
	}
	//MUL
	for (i=3;i<5;++i) if (vue.RS[i].state == 'WRITING') vue.RS[i].clear();
	for (i=3;i<5;++i) if (vue.RS[i].state == 'RUNNING') break;
	if (i == 5) {
		for (j=3;j<5;++j) {
			if (vue.RS[j].isReady()) {
				vue.RS[j].run();
				vue.RunningMul = j;
				vue.RS[j].operation.execute = vue.timestamp;
				break;
			}
		}
	} else {
		vue.RS[i].run();
		if (vue.RS[i].time == 0) {
			vue.RS[i].state = 'WRITING';
			vue.RS[i].operation.writeResult = vue.timestamp+1;
			notify[vue.RS[i].id] = (vue.RS[i].operation.operator == 'MULD')
				? (vue.RS[i].j.V * vue.RS[i].k.V)
				: (vue.RS[i].j.V / vue.RS[i].k.V);
		}
	}
	//LD
	for (i=0;i<3;++i) if (vue.Buffer[i].state == 'WRITING') vue.Buffer[i].clear();
	for (i=0;i<3;++i) if (vue.Buffer[i].state == 'RUNNING') break;
	if (i == 3) {
		for (j=0;j<3;++j) {
			if (vue.Buffer[j].isReady()) {
				vue.Buffer[j].run();
				vue.Buffer[j].operation.execute = vue.timestamp;
				break;
			}
		}
	} else {
		vue.Buffer[i].run();
		if (vue.Buffer[i].time == 0) {
			vue.Buffer[i].state = 'WRITING';
			vue.Buffer[i].operation.writeResult = vue.timestamp+1;
			++vue.RunningMemory;
			notify[vue.Buffer[i].id] = loadMemory(vue.Buffer[i].A);
		}
	}
	//ST
	for (i=3;i<6;++i) if (vue.Buffer[i].state == 'RUNNING') break;
	if (i == 6) {
		for (j=3;j<6;++j) {
			if (vue.Buffer[j].isReady()) {
				vue.Buffer[j].run();
				vue.Buffer[j].operation.execute = vue.timestamp;
				break;
			}
		}
	} else {
		vue.Buffer[i].run();
		if (vue.Buffer[i].time == 0) {
			storeMemory(vue.Buffer[i].A, vue.Buffer[i].QV.V);
			vue.Buffer[i].operation.writeResult = '--';
			vue.Buffer[i].clear();
			++vue.RunningMemory;
		}
	}
	for (i=0;i<5;++i) if (vue.RS[i].state == 'ISSUED') vue.RS[i].state = 'WAITING';
	for (i=0;i<6;++i) if (vue.Buffer[i].state == 'ISSUED') vue.Buffer[i].state = 'WAITING';
	//notify
	console.log(notify);
	for (var index in notify) {
		value = notify[index];
		for (i=0;i<5;++i) {
			vue.RS[i].j.update(index, value);
			vue.RS[i].k.update(index, value);
		}
		for (i=3;i<6;++i) {
			vue.Buffer[i].QV.update(index, value);
		}
		for (i=0;i<=10;++i) {
			vue.Registers[i].QV.update(index, value);
		}
	}
}

function runNStep(n) {
	for (var i=0;i<n;++i)
		runOneStep();
}

for (let _i=0;_i<20;++_i) {
	storeMemory(_i, _i);
}