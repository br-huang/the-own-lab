import Darwin
import Foundation

class PTY {
    private var masterFD: Int32 = -1
    private var childPID: pid_t = -1

    // 1. Start
    func start() {
        var pty = Darwin.forkpty(&masterFD, nil, nil, nil)
        if pty == 0 {
            Darwin.execvp("/bin/zsh", nil)
        } else if pty > 0 {
            var parent_process = pty
        }
    }

    // Read

}
