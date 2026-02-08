fn main() {
    let bytes = include_bytes!("../icons/menu_show.png");
    let image = tauri::image::Image::from_bytes(bytes);
    // Force a type error to see what image is
    let _: () = image;
}
