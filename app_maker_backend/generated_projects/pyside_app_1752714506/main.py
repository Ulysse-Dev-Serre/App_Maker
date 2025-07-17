import sys
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QLabel, QVBoxLayout, QMessageBox
from PySide6.QtCore import QTimer

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Simple Timer App")

        self.label = QLabel("0")
        self.button = QPushButton("Start")
        self.button.clicked.connect(self.start_timer)

        layout = QVBoxLayout()
        layout.addWidget(self.label)
        layout.addWidget(self.button)
        self.setLayout(layout)

        self.timer = QTimer()
        self.timer.timeout.connect(self.update_label)
        self.counter = 0

    def start_timer(self):
        if self.timer.isActive():
            self.timer.stop()
            self.button.setText("Start")
        else:
            self.timer.start(1000)
            self.button.setText("Stop")

    def update_label(self):
        self.counter += 1
        self.label.setText(str(self.counter))

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())