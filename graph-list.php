<?php
$type = htmlspecialchars($_GET["type"]);
$flist = scandir("json/");
foreach($flist as $file){
    if(strpos($file, ".".$type.".") !== false){
        echo "<a href=\"".$type.".html?input=".$file."\">".$file."</a><br>";
    }
}
?>
