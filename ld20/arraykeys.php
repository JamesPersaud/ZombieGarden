<?php

$test = array("One"=>"Hello", "Two"=>"Ooo","Three"=>"It's all sticky");

foreach(array_keys($test) as $key){
	echo $key." ".$test[$key];
}

?>
