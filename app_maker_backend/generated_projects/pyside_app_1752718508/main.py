import sys
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Five Buttons")
        self.setGeometry(100, 100, 400, 400)

        layout = QVBoxLayout()
        for i in range(5):
            button = QPushButton(f"Button {i+1}")
            layout.addWidget(button)

        self.setLayout(layout)

def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()