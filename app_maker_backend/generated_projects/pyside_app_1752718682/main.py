from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout
from PySide6.QtGui import QColor

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("My App")
        self.setGeometry(100, 100, 400, 400)
        self.setStyleSheet("background-color: blue;")

        layout = QVBoxLayout()
        for i in range(5):
            button = QPushButton(f"Button {i+1}")
            button.setStyleSheet("background-color: red;")
            layout.addWidget(button)

        self.setLayout(layout)

if __name__ == "__main__":
    app = QApplication([])
    window = MainWindow()
    window.show()
    app.exec()