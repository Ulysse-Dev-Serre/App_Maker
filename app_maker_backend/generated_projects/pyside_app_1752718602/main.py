import sys
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("5 Button Window")
        self.setGeometry(100, 100, 400, 400)

        layout = QVBoxLayout()
        colors = ["red", "green", "blue", "yellow", "purple"]
        for color in colors:
            button = QPushButton(color)
            button.setStyleSheet(f"background-color: {color};")
            layout.addWidget(button)

        self.setLayout(layout)

def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()