import { mount } from 'driftjs-dom';
import App from './App.drift';
import { DevToolsBridge } from './bridge.js';

const container = document.getElementById('app') as HTMLElement;

if (container) {
  const vm = mount(App as any, container);

  const bridge = new DevToolsBridge({
    onDetected(version, vmCount) {
      if (typeof vm.scope.handleDetected === 'function') {
        vm.scope.handleDetected(version, vmCount);
        vm.markDirty('connected');
        vm.markDirty('driftVersion');
      }
    },
    onTree(vms) {
      if (typeof vm.scope.handleTree === 'function') {
        vm.scope.handleTree(vms);
        vm.markDirty('vms');
        vm.markDirty('filteredVms');
        vm.markDirty('selectedVm');
        vm.markDirty('selectedVmId');
      }
    },
    onVMUpdated(vmId, scope, dirtyVars) {
      if (typeof vm.scope.handleVMUpdated === 'function') {
        vm.scope.handleVMUpdated(vmId, scope, dirtyVars);
        vm.markDirty('selectedVm');
        vm.markDirty('vms');
        vm.markDirty('filteredVms');
      }
    },
    onVMMounted(newVm) {
      if (typeof vm.scope.handleVMMounted === 'function') {
        vm.scope.handleVMMounted(newVm);
        vm.markDirty('vms');
        vm.markDirty('filteredVms');
        vm.markDirty('selectedVm');
      }
    },
    onVMUnmounted(vmId) {
      if (typeof vm.scope.handleVMUnmounted === 'function') {
        vm.scope.handleVMUnmounted(vmId);
        vm.markDirty('vms');
        vm.markDirty('filteredVms');
        vm.markDirty('selectedVm');
      }
    },
    onEvent(event) {
      if (typeof vm.scope.handleEvent === 'function') {
        vm.scope.handleEvent(event);
        vm.markDirty('events');
        vm.markDirty('snapshots');
        vm.markDirty('selectedSnapshotIndex');
        vm.markDirty('totalFlushes');
        vm.markDirty('avgFlushDuration');
        vm.markDirty('totalPatches');
        vm.markDirty('totalReconciles');
      }
    },
    onReload() {
      if (typeof vm.scope.handleTree === 'function') {
        vm.scope.handleTree([]);
        vm.markDirty('vms');
        vm.markDirty('selectedVm');
      }
    },
  });

  if (typeof vm.scope.setBridge === 'function') {
    vm.scope.setBridge(bridge);
  }

  // Request initial tree
  bridge.refreshTree();
}
